/**
 * 获取客户端真实IP地址
 * 考虑代理服务器（如Nginx、Zeabur等）的情况
 * @param {Object} req - Express请求对象
 * @returns {string} 客户端IP地址
 */
export function getClientIp(req) {
    // 优先检查 X-Forwarded-For 头（代理服务器设置）
    const forwardedFor = req.headers['x-forwarded-for'];
    if (forwardedFor) {
        // X-Forwarded-For 可能包含多个IP，取第一个（原始客户端IP）
        const ips = forwardedFor.split(',').map(ip => ip.trim());
        return ips[0] || 'unknown';
    }
    
    // 检查 X-Real-IP 头（Nginx等代理服务器设置）
    const realIp = req.headers['x-real-ip'];
    if (realIp) {
        return realIp;
    }
    
    // 回退到连接IP地址
    return req.connection?.remoteAddress || 
           req.socket?.remoteAddress || 
           req.ip || 
           'unknown';
}

