import { auth } from '@clerk/nextjs/server'

// 定義支持的角色類型
export type Roles = 'admin' | 'bd-editor' | 'user'

// 定義 metadata 類型
type ClerkMetadata = {
  role?: Roles;
}

/**
 * 檢查當前用戶是否具有指定角色
 * @param role 要檢查的角色
 * @returns 如果用戶具有指定角色返回 true，否則返回 false
 */
export const checkRole = async (role: Roles) => {
  const { sessionClaims } = await auth()
  const metadata = sessionClaims?.metadata as ClerkMetadata | undefined
  return metadata?.role === role
}

/**
 * 檢查當前用戶是否有任一指定角色
 * @param roles 要檢查的角色數組
 * @returns 如果用戶具有任一指定角色返回 true，否則返回 false
 */
export const hasAnyRole = async (roles: Roles[]) => {
  const { sessionClaims } = await auth()
  const metadata = sessionClaims?.metadata as ClerkMetadata | undefined
  return roles.includes(metadata?.role as Roles)
} 