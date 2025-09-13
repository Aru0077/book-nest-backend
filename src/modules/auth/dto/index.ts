// 导出所有认证相关的DTO

// ========================================
// 基础认证 DTO
// ========================================
export * from './login.dto';
export * from './register.dto';
export * from './auth-response.dto';
export * from './refresh-token.dto';

// ========================================
// 密码管理 DTO
// ========================================
export * from './change-password.dto';
export * from './forgot-password.dto';
export * from './update-profile.dto';

// ========================================
// 管理员相关 DTO
// ========================================
export * from './admin-register.dto';
export * from './admin-approval.dto';

// ========================================
// 商家认证相关 DTO
// ========================================
export * from './verification.dto';
export * from './merchant-profile.dto';
