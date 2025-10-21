import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SecurityAuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(SecurityAuditInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url } = request;
    
    const apiKey = request.headers['x-api-key'];
    const organizationId = request.organizationId;
    const userAgent = request.headers['user-agent'];
    const ip = request.ip || request.connection?.remoteAddress;
    const timestamp = new Date().toISOString();

    this.logger.log({
      type: 'API_REQUEST',
      method,
      url,
      organizationId,
      apiKeyPrefix: apiKey ? `${apiKey.substring(0, 10)}...` : 'none',
      userAgent,
      ip,
      timestamp,
    });

    this.performSecurityChecks(request);

    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: (data) => {
          const duration = Date.now() - startTime;
          
          this.logger.log({
            type: 'API_SUCCESS',
            method,
            url,
            organizationId,
            duration,
            timestamp,
            responseSize: JSON.stringify(data || {}).length,
          });
        },
        error: (error) => {
          const duration = Date.now() - startTime;
          
          this.logger.error({
            type: 'API_ERROR',
            method,
            url,
            organizationId,
            error: error.message,
            statusCode: error.status,
            duration,
            timestamp,
            stack: error.stack,
          });
        },
      }),
    );
  }

  private performSecurityChecks(request: any): void {
    const organizationId = request.organizationId;

    if (!organizationId && request.headers['x-api-key']) {
      this.logger.error({
        type: 'SECURITY_VIOLATION',
        violation: 'MISSING_ORGANIZATION_ID',
        message: 'Request with API Key but no organization_id resolved',
        apiKeyPrefix: request.headers['x-api-key'].substring(0, 10),
        url: request.url,
        timestamp: new Date().toISOString(),
      });
    }

    const bodyOrgReferences = this.extractOrganizationReferences(request.body);
    if (bodyOrgReferences.length > 0 && organizationId) {
      bodyOrgReferences.forEach(ref => {
        if (ref !== organizationId) {
          this.logger.warn({
            type: 'SECURITY_WARNING',
            violation: 'CROSS_ORGANIZATION_REFERENCE',
            message: 'Request contains reference to different organization',
            requestOrgId: organizationId,
            referencedOrgId: ref,
            url: request.url,
            timestamp: new Date().toISOString(),
          });
        }
      });
    }

    this.detectSuspiciousPatterns(request);
  }

  private extractOrganizationReferences(body: any): number[] {
    const refs: number[] = [];
    
    if (!body || typeof body !== 'object') {
      return refs;
    }

    const orgFields = ['organization_id', 'organizationId', 'org_id'];
    
    for (const field of orgFields) {
      if (body[field] && typeof body[field] === 'number') {
        refs.push(body[field]);
      }
    }

    return refs;
  }

  private detectSuspiciousPatterns(request: any): void {
    const body = JSON.stringify(request.body || {});
    const url = request.url;
    const suspiciousPatterns = [
      /SELECT\s+\*\s+FROM/i,           
      /<script[^>]*>/i,               
      /\.\.\//,                       
      /exec\s*\(/i,
      /__proto__|constructor|prototype/i,
    ];

    suspiciousPatterns.forEach((pattern, index) => {
      if (pattern.test(body) || pattern.test(url)) {
        this.logger.error({
          type: 'SECURITY_ALERT',
          violation: 'SUSPICIOUS_PATTERN_DETECTED',
          pattern: pattern.source,
          patternIndex: index,
          url: request.url,
          organizationId: request.organizationId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
}