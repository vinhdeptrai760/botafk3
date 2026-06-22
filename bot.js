// ==========================================
// 1. WEB SERVER ẢO (GIỮ ONLINE)
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot NPC cắm chốt siêu lì đang online 24/7!');
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`[Web Server] Đã bật web ảo trên port ${port}`);
});

// ==========================================
// 2. KHAI BÁO THƯ VIỆN & BIẾN TOÀN CỤC
// ==========================================
const mineflayer = require('mineflayer');
const readline = require('readline');
const { Vec3 } = require('vec3');

const {
    pathfinder,
    Movements,
    goals
} = require('mineflayer-pathfinder');

let bot; 
let antiAfkTask = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ==========================================
// 3. HÀM KHỞI TẠO BOT (CHỐNG TIMEOUT TUYỆT ĐỐI)
// ==========================================
function createMyBot() {
    console.log('[Hệ Thống] Đang tiến hành kết nối vào server...');
    
    bot = mineflayer.createBot({
        host: 'donutsmp.net', 
        port: 25565,
        auth: 'microsoft', 
        username: 'letrungvinhv2@outlook.com', 
        profilesFolder: './auth-cache',
        
        brand: 'vanilla',            
        version: '1.21.1',           
        viewDistance: 'tiny',       
        physicsEnabled: false, // Đứng im như tượng, không rơi, không bị đẩy

        // 🛠️ ĐÂY LÀ ĐOẠN KHẮC TINH CỦA LỖI TIMEOUT:
        // Tăng thời gian chờ gói tin lên hẳn 24 tiếng (86400000 ms) thay vì 90 giây cũ!
        // Server có lag, có nghẽn mạch, bot vẫn sẽ lì lợm đứng đợi chứ không tự ý out game nữa.
        checkTimeoutInterval: 86400000 
    });

    bot.loadPlugin(pathfinder);

    bot.on('resourcePack', () => {
        bot.acceptResourcePack();
    });

    bot.on('spawn', () => {
        console.log('[Hệ Thống] Đã kết nối vào khu farm!');
        bot.physics.enabled = false; 

        setTimeout(() => {
            if (!bot) return;
            console.log('[Hệ Thống] Bot đã bám rễ tại chỗ thành công.');
            startSilentAntiAfk();
        }, 3500);
    });

    // Bỏ qua các log lỗi vặt khi mạng lag để tránh làm tràn luồng xử lý
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET' || err.message.includes('timeout')) {
            console.log('[Bộ Lọc] Server đang giật lag / nghẽn mạng nhẹ. Bot vẫn đang gồng giữ kết nối...');
        } else {
            console.log('[Lỗi Hệ Thống]:', err.message || err);
        }
    });
    
    bot.on('kicked', (reason) => console.log('[Bot bị kick]:', JSON.stringify(reason)));

    // CHỈ KHI NÀO SERVER SẬP HOÀN TOÀN (RESTART) THÌ MỚI VÀO LẠI
    bot.on('end', (reason) => {
        console.log(`[Hệ Thống] Rời server do: ${reason}`);
        console.log('[Hệ Thống] Sẽ tự động kết nối lại sau 30 giây...');
        
        stopEverything(); 

        setTimeout(() => {
            createMyBot(); 
        }, 30000); 
    });
}

createMyBot();

// ==========================================
// CHỐNG KICK ẨN (GỬI LỆNH REFRESH TÀNG HÌNH)
// ==========================================
function startSilentAntiAfk() {
    if (antiAfkTask) clearInterval(antiAfkTask);
    
    // Cứ mỗi 45 giây, gửi lệnh ẩn /ping lên hệ thống để thông báo bot còn sống
    // Cơ thể bot đứng im 100% không làm xáo trộn khu farm của bạn
    antiAfkTask = setInterval(() => {
        if (!bot || !bot.entity) return;
        bot.chat('/ping'); 
    }, 45000);
}

function stopEverything() {
    if (!bot) return;
    if (antiAfkTask) { clearInterval(antiAfkTask); antiAfkTask = null; }
    console.log('Stopped all tasks.');
}
