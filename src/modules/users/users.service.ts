import { Injectable, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as argon2 from 'argon2';
import { User } from '../../database/entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async updateUser(userId: number, dto: UpdateUserDto): Promise<User> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Usuário não encontrado');
    }

    if (dto.name) {
      user.name = dto.name;
    }

    if (dto.newPassword) {
      if (!dto.currentPassword) {
        throw new BadRequestException('A senha atual é obrigatória para trocar a senha');
      }

      const isPasswordValid = await argon2.verify(user.password_hash, dto.currentPassword);
      if (!isPasswordValid) {
        throw new UnauthorizedException('A senha atual está incorreta');
      }

      const newPasswordHash = await argon2.hash(dto.newPassword);
      if (newPasswordHash === user.password_hash) {
        throw new BadRequestException('A nova senha não pode ser igual à senha atual');
      }

      user.password_hash = newPasswordHash;
    }

    return this.userRepo.save(user);
  }
}
