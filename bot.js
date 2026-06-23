const mineflayer = require('mineflayer');

let bot;
let antiAfkInterval;

function createMyBot() {
    console.log('[Hệ Thống] Đang kết nối vào server...');

    bot = mineflayer.createBot({
        host: 'donutsmp.net', 
        port: 25565,
        auth: 'microsoft', 
        username: 'letrungvinhv2@outlook.com', // Nhớ đổi đúng email cho từng con bot
        profilesFolder: './auth-cache',
        version: '1.21.1',
        
        // Ép thời gian chờ lên vô hạn (24 tiếng). Mạng lag bot vẫn đứng im đợi chứ KHÔNG tự out
        checkTimeoutInterval: 86400000 
    });

    bot.on('spawn', () => {
        console.log('[Hệ Thống] Bot đã vào game thành công và đang đứng im!');
        
        // Bật vòng lặp tàng hình: Cứ 40 giây tự gõ /ping để server không đá vì tội AFK
        if (antiAfkInterval) clearInterval(antiAfkInterval);
        antiAfkInterval = setInterval(() => {
            if (bot && bot.entity) {
                bot.chat('/ping');
            }
        }, 40000);
    });

    // Bỏ qua hoàn toàn các thông báo lỗi lag mạng để bot không bị crash luồng
    bot.on('error', (err) => {
        console.log('[Mạng Giật Lag] Bot vẫn đang gồng giữ kết nối, quyết không out...');
    });

    bot.on('kicked', (reason) => {
        console.log('[Bị Server Kick]:', JSON.stringify(reason));
    });

    // CHỈ KHI NÀO SERVER SẬP HOÀN TOÀN THÌ MỚI VÀO LẠI
    bot.on('end', (reason) => {
        console.log(`[Mất Kết Nối]: Do ${reason}. Sẽ kết nối lại sau 30 giây...`);
        if (antiAfkInterval) clearInterval(antiAfkInterval);
        setTimeout(() => {
            createMyBot();
        }, 30000);
    });
}

// Chạy kích hoạt bot
createMyBot();
