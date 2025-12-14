/**
 * 完整版示例应用入口
 *
 * 运行方式:
 *   cd tutorial/02-full
 *   npx ts-node src/demo-app/main.ts
 *
 * 测试接口:
 *
 * 1. 获取所有猫咪 (无需认证)
 *    curl http://localhost:3000/cats
 *
 * 2. 搜索猫咪
 *    curl "http://localhost:3000/cats/search?name=小橘"
 *
 * 3. 获取单个猫咪
 *    curl http://localhost:3000/cats/1
 *
 * 4. 创建猫咪 (需要认证)
 *    curl -X POST http://localhost:3000/cats \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer valid-token" \
 *      -d '{"name":"小白","age":1,"breed":"波斯猫"}'
 *
 * 5. 创建猫咪 (无认证 - 会被守卫拒绝)
 *    curl -X POST http://localhost:3000/cats \
 *      -H "Content-Type: application/json" \
 *      -d '{"name":"小白","age":1}'
 *
 * 6. 创建猫咪 (验证失败)
 *    curl -X POST http://localhost:3000/cats \
 *      -H "Content-Type: application/json" \
 *      -H "Authorization: Bearer valid-token" \
 *      -d '{"name":"","age":-1}'
 *
 * 7. 删除猫咪 (需要认证)
 *    curl -X DELETE http://localhost:3000/cats/1 \
 *      -H "Authorization: Bearer valid-token"
 *
 * 8. 访问不存在的猫咪 (404 异常)
 *    curl http://localhost:3000/cats/999
 */
import 'reflect-metadata';
import { MiniNestFactory } from '../mini-nest';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('\n🐱 MiniNest 完整版示例应用\n');
  console.log('此示例演示:');
  console.log('  - 守卫 (Guards): 认证检查');
  console.log('  - 管道 (Pipes): 参数验证和转换');
  console.log('  - 拦截器 (Interceptors): 日志记录、响应转换');
  console.log('  - 异常过滤器 (Exception Filters): 统一错误处理');
  console.log('');

  const app = await MiniNestFactory.create(AppModule);
  await app.listen(3000);

  console.log('\n📋 可用测试命令:');
  console.log('');
  console.log('# 获取所有猫咪');
  console.log('curl http://localhost:3000/cats');
  console.log('');
  console.log('# 获取单个猫咪');
  console.log('curl http://localhost:3000/cats/1');
  console.log('');
  console.log('# 创建猫咪 (需要认证)');
  console.log('curl -X POST http://localhost:3000/cats \\');
  console.log('  -H "Content-Type: application/json" \\');
  console.log('  -H "Authorization: Bearer valid-token" \\');
  console.log('  -d \'{"name":"小白","age":1}\'');
  console.log('');
}

bootstrap().catch(console.error);
