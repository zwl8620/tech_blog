// 唯一 GitHub API 封装（PRD §5.3 约束：仅被 /console 页引用）
// Token 仅存浏览器 localStorage，不经过任何第三方服务器（PRD F10）

const REPO = 'zwl8620/tech_blog';
const API = 'https://api.github.com';
const TOKEN_KEY = 'lzw_console_token';

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

async function ghFetch(path: string, init: RequestInit = {}): Promise<Response> {
  const token = getToken();
  if (!token) throw new AuthError('未登录');
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  return res;
}

export class AuthError extends Error {}
export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** 统一错误映射（PRD C4：401/403 → 重新登录，内容保留） */
function handleStatus(status: number) {
  if (status === 401 || status === 403) {
    throw new AuthError('访问令牌已失效或权限不足，请重新输入');
  }
  if (status === 404) throw new ApiError(status, '文件不存在');
  if (status === 409) throw new ApiError(status, 'SHA 冲突，请刷新后重试');
  if (status === 422) throw new ApiError(status, '请求参数无效');
  throw new ApiError(status, `GitHub API 错误（${status}）`);
}

/** 登录校验：Token 有效 且 对本仓库有写权限（PRD F10） */
export async function verifyToken(): Promise<{ login: string }> {
  const res = await fetch(`${API}/user`, {
    headers: { Authorization: `Bearer ${getToken()}`, Accept: 'application/vnd.github+json' },
  });
  if (!res.ok) handleStatus(res.status);
  const user = await res.json();

  const permRes = await ghFetch(`/repos/${REPO}`);
  if (!permRes.ok) handleStatus(permRes.status);
  const repo = await permRes.json();
  if (!repo.permissions?.push) {
    throw new AuthError('该令牌对本仓库无写权限');
  }
  return { login: user.login };
}

/** 读文件：返回 { content(base64), sha }；不存在返回 null */
export async function getFile(path: string, ref = 'main') {
  const res = await ghFetch(`/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=${ref}`);
  if (res.status === 404) return null;
  if (!res.ok) handleStatus(res.status);
  const json = await res.json();
  // 内容可能被 base64 分段，需拼接解码
  const raw = json.content.replace(/\n/g, '');
  const text = new TextDecoder().decode(Uint8Array.from(atob(raw), (c) => c.charCodeAt(0)));
  return { text, sha: json.sha as string };
}

/** 写文件：存在则更新，不存在则创建（PRD F11/F12） */
export async function putFile(path: string, content: string, message: string, sha?: string) {
  const base64 = btoa(String.fromCharCode(...new TextEncoder().encode(content)));
  const res = await ghFetch(`/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'PUT',
    body: JSON.stringify({ message, content: base64, ...(sha ? { sha } : {}) }),
  });
  if (!res.ok) handleStatus(res.status);
  return res.json();
}

/** 删除文件（PRD F11，需调用方先二次确认） */
export async function deleteFile(path: string, sha: string, message: string) {
  const res = await ghFetch(`/repos/${REPO}/contents/${encodeURIComponent(path)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message, sha }),
  });
  if (!res.ok) handleStatus(res.status);
}

/** 列目录：用于文章列表 / 上传目录检查 */
export async function listDir(path: string): Promise<{ name: string; path: string; sha: string; size: number }[]> {
  const res = await ghFetch(`/repos/${REPO}/contents/${encodeURIComponent(path)}?ref=main`);
  if (res.status === 404) return [];
  if (!res.ok) handleStatus(res.status);
  const json = await res.json();
  return Array.isArray(json) ? json : [];
}
