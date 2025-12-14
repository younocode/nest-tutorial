/**
 * AuthGuard - 认证守卫示例
 *
 * 演示如何实现一个简单的认证守卫
 * 真实场景中会验证 JWT Token 或 Session
 */
import { CanActivate, ExecutionContext } from '../../../mini-nest';

export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.getRequest();

    // 从请求头获取认证信息
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      console.log('  [AuthGuard] ❌ 缺少 Authorization 头');
      return false;
    }

    // 简化的 Token 验证（真实场景应该验证 JWT）
    if (authHeader === 'Bearer valid-token') {
      console.log('  [AuthGuard] ✓ Token 验证通过');
      return true;
    }

    console.log('  [AuthGuard] ❌ Token 无效');
    return false;
  }
}

/**
 * RolesGuard - 角色守卫示例
 *
 * 演示如何实现基于角色的访问控制
 */
export class RolesGuard implements CanActivate {
  constructor(private readonly allowedRoles: string[] = ['admin']) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.getRequest();

    // 从请求头获取用户角色（真实场景会从 JWT 解析）
    const userRole = request.headers['x-user-role'] as string;

    if (!userRole) {
      console.log('  [RolesGuard] ❌ 缺少用户角色');
      return false;
    }

    const hasRole = this.allowedRoles.includes(userRole);

    if (hasRole) {
      console.log(`  [RolesGuard] ✓ 用户角色 ${userRole} 有权限访问`);
    } else {
      console.log(`  [RolesGuard] ❌ 用户角色 ${userRole} 无权限访问`);
    }

    return hasRole;
  }
}
