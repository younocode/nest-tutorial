/**
 * CatsModule - 猫咪模块
 *
 * 演示模块的定义和组织方式
 *
 * 模块的职责：
 * 1. 组织相关的控制器和提供者
 * 2. 通过 exports 暴露服务给其他模块使用
 * 3. 通过 imports 引入其他模块的服务
 */
import { Module } from '../../mini-nest';
import { CatsController } from './cats.controller';
import { CatsService } from './cats.service';

@Module({
  // 控制器：处理 HTTP 请求
  controllers: [CatsController],

  // 提供者：业务逻辑服务
  // CatsService 会被注册到模块中，供 CatsController 注入
  providers: [CatsService],

  // 导出：其他模块导入 CatsModule 后可以使用 CatsService
  // 如果不导出，CatsService 只能在本模块内使用
  exports: [CatsService],
})
export class CatsModule {}
