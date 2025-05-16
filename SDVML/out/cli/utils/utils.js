export function inferTypeFromMessage(msg) {
    if (/^-?\d+$/.test(msg))
        return 'std_msgs.msg.Int32';
    if (/^-?\d+\.\d+$/.test(msg))
        return 'std_msgs.msg.Float64';
    if (/^["'].*["']$/.test(msg))
        return 'std_msgs.msg.String';
    return 'std_msgs.msg.String';
}
export function resolveMessageType(userType, message) {
    var _a;
    const typeName = (userType === null || userType === void 0 ? void 0 : userType.trim()) || inferTypeFromMessage(message);
    return (_a = typeName.split('.').at(-1)) !== null && _a !== void 0 ? _a : typeName;
}
//# sourceMappingURL=utils.js.map