async function unmuteCommand(sock, chatId) {
    await sock.groupSettingUpdate(chatId, 'not_announcement'); // Unmute the group
    await sock.sendMessage(chatId, { text: 'تم إلغاء كتم صوت المجموعة.' });
}

module.exports = unmuteCommand;
