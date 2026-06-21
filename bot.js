// ==========================================
// 1. WEB SERVER ẢO (GIỮ ONLINE NẾU CẦN)
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot Mineflayer đang AFK 24/7!');
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
let antiAfk = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ==========================================
// 3. HÀM KHỞI TẠO BOT (CÓ AUTO-RECONNECT)
// ==========================================
function createMyBot() {
    console.log('[Hệ Thống] Đang tiến hành kết nối vào server...');
    
    bot = mineflayer.createBot({
        host: 'donutsmp.net', // Hoặc 'kingmc.vn' tùy bạn đổi nhé
        port: 25565,
        auth: 'microsoft', 
        username: 'letrungvinhv2@outlook.com', 
        profilesFolder: './auth-cache',
        
        brand: 'vanilla',            
        version: '1.21.1',           
        viewDistance: 'tiny',       
        checkTimeoutInterval: 90000, 
        physicsEnabled: false       
    });

    bot.loadPlugin(pathfinder);

    bot.on('resourcePack', () => {
        bot.acceptResourcePack();
    });

    bot.on('spawn', () => {
        console.log('[Hệ Thống] Đã kết nối! Đang đóng băng bot 3 giây để bypass Anti-cheat...');
        
        bot.physics.enabled = false; 

        setTimeout(() => {
            if (!bot) return;
            
            bot.physics.enabled = true; 
            const defaultMove = new Movements(bot);
            bot.pathfinder.setMovements(defaultMove);
            
            console.log('[Hệ Thống] Bot đã vào game an toàn và sẵn sàng AFK!');

            // Kích hoạt tính năng nhảy nhảy chống AFK của server
            startAntiAfk();

        }, 3500);
    });

    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            console.log('[Bộ Lọc] Phát hiện Server reset kết nối đột ngột (ECONNRESET).');
        } else {
            console.log('[Lỗi Hệ Thống]:', err.message || err);
        }
    });
    
    bot.on('kicked', (reason) => console.log('[Bot bị kick]:', JSON.stringify(reason)));

    // CƠ CHẾ TỰ KẾT NỐI LẠI KHI SẬP SERVER
    bot.on('end', (reason) => {
        console.log(`[Hệ Thống] Ngắt kết nối do: ${reason}`);
        console.log('[Hệ Thống] Sẽ tự động kết nối lại sau 30 giây...');
        
        stopEverything(); 

        setTimeout(() => {
            createMyBot(); 
        }, 30000); 
    });
}

// Khởi chạy hệ thống
createMyBot();

// ==========================================
// 🛠️ CHỨC NĂNG CHỐNG KICK AFK CỦA SERVER
// ==========================================
function startAntiAfk() {
    if (antiAfk) clearInterval(antiAfk);
    
    // Cứ mỗi 30 giây bot sẽ nhảy một cái nhẹ và quay người ngẫu nhiên để server không kick
    antiAfk = setInterval(() => {
        if (!bot || !bot.entity) return;
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 300);
        
        const yaw = bot.entity.yaw + (Math.random() - 0.5);
        bot.look(yaw, bot.entity.pitch, true);
    }, 30000);
    console.log('[Anti AFK] Đã bật tự động chống kick AFK.');
}

function stopEverything() {
    if (!bot) return;
    try { bot.clearControlStates(); } catch(e){}
    if (antiAfk) { clearInterval(antiAfk); antiAfk = null; }
    console.log('Stopped all tasks.');
}
