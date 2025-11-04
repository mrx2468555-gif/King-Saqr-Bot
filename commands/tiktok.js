const { ttdl } = require("ruhend-scraper");
const axios = require('axios');

// Store processed message IDs to prevent duplicates
const processedMessages = new Set();

async function tiktokCommand(sock, chatId, message) {
    try {
        // Check if message has already been processed
        if (processedMessages.has(message.key.id)) {
            return;
        }
        
        // Add message ID to processed set
        processedMessages.add(message.key.id);
        
        // Clean up old message IDs after 5 minutes
        setTimeout(() => {
            processedMessages.delete(message.key.id);
        }, 5 * 60 * 1000);

        const text = message.message?.conversation || message.message?.extendedTextMessage?.text;
        
        if (!text) {
            return await sock.sendMessage(chatId, { 
                text: "يرجي ارسال رابط فيديو تيك توك ."
            });
        }

        // Extract URL from command
        const url = text.split(' ').slice(1).join(' ').trim();
        
        if (!url) {
            return await sock.sendMessage(chatId, { 
                text: "يرجي ارسال رابط فيديو تيك توك."
            });
        }

        // Check for various TikTok URL formats
        const tiktokPatterns = [
            /https?:\/\/(?:www\.)?tiktok\.com\//,
            /https?:\/\/(?:vm\.)?tiktok\.com\//,
            /https?:\/\/(?:vt\.)?tiktok\.com\//,
            /https?:\/\/(?:www\.)?tiktok\.com\/@/,
            /https?:\/\/(?:www\.)?tiktok\.com\/t\//
        ];

        const isValidUrl = tiktokPatterns.some(pattern => pattern.test(url));
        
        if (!isValidUrl) {
            return await sock.sendMessage(chatId, { 
                text: "هذا ليس رابط تيك توك صحيح. يُرجى ارسال رابط فيديو تيك توك .."
            });
        }

        await sock.sendMessage(chatId, {
            react: { text: '🔄', key: message.key }
        });

        try {
            // First try with the direct URL
            let downloadData = await ttdl(url);
            
            // If that fails, try with the API
            if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
                const apiResponse = await axios.get(`https://api.dreaded.site/api/tiktok?url=${encodeURIComponent(url)}`);
                if (apiResponse.data && apiResponse.data.status === 200 && apiResponse.data.tiktok) {
                    const videoUrl = apiResponse.data.tiktok.video;
                    if (videoUrl) {
                        await sock.sendMessage(chatId, {
                            video: { url: videoUrl },
                            mimetype: "video/mp4",
                            caption: "*DOWNLOADED BY Abdulrahman*"
                        }, { quoted: message });
                        return;
                    }
                }
            }

            if (!downloadData || !downloadData.data || downloadData.data.length === 0) {
                return await sock.sendMessage(chatId, { 
                    text: "لم يتم العثور على أي وسائط في الرابط المُقدّم. يُرجى المحاولة مرة أخرى باستخدام رابط آخر.."
                });
            }

            const mediaData = downloadData.data;
            for (let i = 0; i < Math.min(20, mediaData.length); i++) {
                const media = mediaData[i];
                const mediaUrl = media.url;

                // Check if URL ends with common video extensions
                const isVideo = /\.(mp4|mov|avi|mkv|webm)$/i.test(mediaUrl) || 
                              media.type === 'video';

                if (isVideo) {
                    await sock.sendMessage(chatId, {
                        video: { url: mediaUrl },
                        mimetype: "video/mp4",
                        caption: "*DOWNLOADED BY Abdulrahman*"
                    }, { quoted: message });
                } else {
                    await sock.sendMessage(chatId, {
                        image: { url: mediaUrl },
                        caption: "*DOWNLOADED BY Abdulrahman*"
                    }, { quoted: message });
                }
            }
        } catch (error) {
            console.error('Error in TikTok download:', error);
            await sock.sendMessage(chatId, { 
                text: "تعذّر تنزيل فيديو تيك توك. يُرجى المحاولة مجددًا باستخدام رابط اخر.."
            });
        }
    } catch (error) {
        console.error('Error in TikTok command:', error);
        await sock.sendMessage(chatId, { 
            text: "حدث خطأ أثناء معالجة الطلب. يُرجى المحاولة لاحقًا.."
        });
    }
}

module.exports = tiktokCommand; 
