import { Injectable } from '@nestjs/common';
import { IntegrationInfoDto, IntegrationStatus } from '../dto/integrations.dto';

type IntegrationState = IntegrationInfoDto & {
  clientId?: string;
  clientSecret?: string;
};

@Injectable()
export class IntegrationsService {
  private googleByOrg = new Map<string, IntegrationState>();

  private getKey(orgId: number, subOrgId: number | null) {
    return `${orgId}:${subOrgId ?? 'null'}`;
  }

  getGoogleIntegration(orgId: number, subOrgId: number | null): IntegrationInfoDto {
    const key = this.getKey(orgId, subOrgId);
    const existing = this.googleByOrg.get(key);
    if (existing) return existing;
    const disconnected: IntegrationState = {
      provider: 'google_calendar',
      status: 'disconnected',
      accountEmail: null,
      lastSyncedAt: null,
      errorMessage: null,
    };
    this.googleByOrg.set(key, disconnected);
    return disconnected;
  }

  connectGoogleIntegration(orgId: number, subOrgId: number | null, payload: { clientId: string; clientSecret: string; redirectUri?: string }): IntegrationInfoDto {
    const key = this.getKey(orgId, subOrgId);
    const state: IntegrationState = {
      provider: 'google_calendar',
      status: 'connected',
      accountEmail: null,
      lastSyncedAt: new Date().toISOString(),
      errorMessage: null,
      clientId: payload.clientId,
      clientSecret: payload.clientSecret,
    };
    this.googleByOrg.set(key, state);
    return state;
  }

  disconnectGoogleIntegration(orgId: number, subOrgId: number | null) {
    const key = this.getKey(orgId, subOrgId);
    this.googleByOrg.set(key, {
      provider: 'google_calendar',
      status: 'disconnected',
      accountEmail: null,
      lastSyncedAt: null,
      errorMessage: null,
    });
    return { disconnected: true };
  }

  setGoogleStatus(orgId: number, subOrgId: number | null, status: IntegrationStatus, errorMessage?: string | null) {
    const key = this.getKey(orgId, subOrgId);
    const current = this.googleByOrg.get(key) ?? this.getGoogleIntegration(orgId, subOrgId);
    const next: IntegrationState = {
      ...current,
      status,
      errorMessage: errorMessage ?? null,
      lastSyncedAt: status === 'connected' ? new Date().toISOString() : current.lastSyncedAt ?? null,
    };
    this.googleByOrg.set(key, next);
    return next;
  }
}
