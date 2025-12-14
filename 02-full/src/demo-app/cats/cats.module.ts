/**
 * CatsModule - 猫咪功能模块
 */
import { Module } from '../../mini-nest';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  controllers: [CatsController],
  providers: [CatsService],
  exports: [CatsService],
})
export class CatsModule {}
