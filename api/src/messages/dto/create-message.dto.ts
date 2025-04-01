import { IsString, IsNotEmpty, IsArray, IsOptional } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  text: string;
}

export class LikeMessageDto {
  @IsString()
  @IsNotEmpty()
  messageId: string;
}
