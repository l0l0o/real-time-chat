import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UsersService } from '../users/users.service';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private messagesRepository: Repository<Message>,
    private usersService: UsersService,
  ) {}

  async create(
    createMessageDto: CreateMessageDto,
    userId: string,
  ): Promise<Message> {
    console.log('createMessageDto : ', createMessageDto);
    const user = await this.usersService.findOne(userId);
    const message = this.messagesRepository.create({
      ...createMessageDto,
      user,
      likes: [],
    });
    return this.messagesRepository.save(message);
  }

  findAll(): Promise<Message[]> {
    return this.messagesRepository.find({
      relations: ['user', 'likes'],
      order: {
        createdAt: 'ASC',
      },
    });
  }

  async findOne(id: string): Promise<Message> {
    const message = await this.messagesRepository.findOne({
      where: { id },
      relations: ['user', 'likes'],
    });
    if (!message) {
      throw new NotFoundException(`Message with ID ${id} not found`);
    }
    return message;
  }

  async update(
    id: string,
    updateMessageDto: CreateMessageDto,
  ): Promise<Message> {
    await this.messagesRepository.update(id, updateMessageDto);
    return this.findOne(id);
  }

  async remove(id: string): Promise<void> {
    await this.messagesRepository.softDelete(id);
  }

  async toggleLike(messageId: string, userId: string): Promise<Message> {
    const message = await this.findOne(messageId);
    const user = await this.usersService.findOne(userId);

    // Vérifie si l'utilisateur a déjà liké le message
    const userHasLikedIndex = message.likes.findIndex(
      (likeUser) => likeUser.id === user.id,
    );

    if (userHasLikedIndex === -1) {
      // Ajoute le like
      message.likes.push(user);
    } else {
      // Retire le like
      message.likes.splice(userHasLikedIndex, 1);
    }

    return this.messagesRepository.save(message);
  }
}
