// ==========================================
// 1. WEB SERVER ẢO (GIỮ RENDER ONLINE)
// ==========================================
const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Bot Mineflayer đang sống nhăn răng 24/7!');
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
let spinTask = null;
let followTask = null;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// ==========================================
// 3. HÀM KHỞI TẠO BOT (CÓ AUTO-RECONNECT + TỐI ƯU DONUT)
// ==========================================
function createMyBot() {
    console.log('[Hệ Thống] Đang tiến hành kết nối vào server...');
    
    bot = mineflayer.createBot({
        host: 'donutsmp.net',
        port: 25565,
        auth: 'microsoft', 
        username: 'letrungvinhv2@outlook.com', 
        profilesFolder: './auth-cache',
        
        // 🛠️ SHIELD 1: Tối ưu gói tin tránh nghẽn mạch trên Render
        viewDistance: 'tiny',       // Giảm tối đa lượng chunk tải về (giảm tải CPU Render)
        checkTimeoutInterval: 90000, // Tăng thời gian chờ đợi gói tin lên 90 giây để tránh timeout
        physicsEnabled: false       // Tắt vật lý ngay từ lúc cấu hình khởi tạo
    });

    bot.loadPlugin(pathfinder);

    // Tự động đồng ý Resource Pack nếu server ép buộc
    bot.on('resourcePack', () => {
        bot.acceptResourcePack();
    });

    bot.on('spawn', () => {
        console.log('[Hệ Thống] Đã kết nối! Đang đóng băng bot 3 giây để bypass Anti-cheat...');
        
        // 🛠️ SHIELD 2: Đóng băng hệ thống vật lý khi vừa vào game
        bot.physics.enabled = false; 

        setTimeout(() => {
            if (!bot) return;
            
            // Sau 3 giây an toàn, mới kích hoạt lại hệ thống di chuyển
            bot.physics.enabled = true; 
            const defaultMove = new Movements(bot);
            bot.pathfinder.setMovements(defaultMove);
            
            console.log('[Hệ Thống] -> BẢO MẬT ĐẠT: Bot đã vào game an toàn và sẵn sàng nhận lệnh!');
        }, 3500);
    });

    // 🛠️ SHIELD 3: Giảm tải log lỗi trùng lặp để tránh làm nghẽn luồng xử lý của Node.js
    bot.on('error', (err) => {
        if (err.code === 'ECONNRESET') {
            console.log('[Bộ Lọc] Phát hiện Server reset kết nối đột ngột (ECONNRESET). Đang xử lý...');
        } else {
            console.log('[Lỗi Hệ Thống]:', err.message || err);
        }
    });
    
    bot.on('kicked', (reason) => {
        console.log('[Bot bị kick]:', JSON.stringify(reason));
    });

    // CƠ CHẾ TỰ KẾT NỐI LẠI
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

// =========================
// HELPERS (HÀM TRỢ GIÚP)
// =========================
function stopEverything() {
    if (!bot) return;
    try { bot.clearControlStates(); } catch(e){}
    try { bot.pathfinder.setGoal(null); } catch(e){}
    try { bot.stopDigging(); } catch(e){}

    if (antiAfk) { clearInterval(antiAfk); antiAfk = null; }
    if (spinTask) { clearInterval(spinTask); spinTask = null; }
    if (followTask) { clearInterval(followTask); followTask = null; }

    console.log('Stopped all tasks.');
}

// =========================
// COMMANDS (LỆNH ĐIỀU KHIỂN VIA TERMINAL)
// =========================
rl.on('line', async (line) => {
    if (!bot || !bot.entity || !bot.physics.enabled) {
        console.log('[Hệ Thống] Bot chưa hoàn thành bypass bảo mật, vui lòng đợi vài giây...');
        return;
    }

    const args = line.trim().split(' ');
    const cmd = args[0];

    if (cmd === '!say') {
        bot.chat(args.slice(1).join(' '));
    }
    else if (cmd === '!command') {
        bot.chat(args.slice(1).join(' ')); 
    }
    else if (cmd === '!pos') {
        const p = bot.entity.position;
        console.log(`X=${p.x.toFixed(2)} Y=${p.y.toFixed(2)} Z=${p.z.toFixed(2)}`);
    }
    else if (cmd === '!look') {
        const playerName = args[1];
        const target = bot.players[playerName];
        if (!target || !target.entity) {
            console.log('Player not found');
            return;
        }
        await bot.lookAt(target.entity.position.offset(0, 1.6, 0));
        console.log(`Looking at ${playerName}`);
    }
    else if (cmd === '!lookpos') {
        const x = parseFloat(args[1]);
        const y = parseFloat(args[2]);
        const z = parseFloat(args[3]);
        await bot.lookAt({ x, y, z });
        console.log(`Looking at ${x} ${y} ${z}`);
    }
    else if (cmd === '!goto') {
        const x = parseInt(args[1]);
        const y = parseInt(args[2]);
        const z = parseInt(args[3]);
        bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
        console.log(`Going to ${x} ${y} ${z}`);
    }
    else if (cmd === '!follow') {
        const playerName = args[1];
        if (followTask) clearInterval(followTask);
        followTask = setInterval(() => {
            const target = bot.players[playerName];
            if (!target || !target.entity) return;
            bot.pathfinder.setGoal(new goals.GoalFollow(target.entity, 2), true);
        }, 1000);
        console.log(`Following ${playerName}`);
    }
    else if (cmd === '!unfollow') {
        if (followTask) {
            clearInterval(followTask);
            followTask = null;
            bot.pathfinder.setGoal(null);
        }
        console.log('Follow stopped');
    }
    else if (cmd === '!forward') bot.setControlState('forward', true);
    else if (cmd === '!back') bot.setControlState('back', true);
    else if (cmd === '!left') bot.setControlState('left', true);
    else if (cmd === '!right') bot.setControlState('right', true);
    else if (cmd === '!jump') {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
    }
    else if (cmd === '!sneak') bot.setControlState('sneak', true);
    else if (cmd === '!sprint') bot.setControlState('sprint', true);
    else if (cmd === '!stop') bot.clearControlStates();
    else if (cmd === '!antiafk') {
        if (antiAfk) { console.log('Already running'); return; }
        antiAfk = setInterval(() => {
            bot.setControlState('jump', true);
            setTimeout(() => bot.setControlState('jump', false), 300);
            const yaw = bot.entity.yaw + (Math.random() - 0.5);
            bot.look(yaw, bot.entity.pitch, true);
        }, 30000);
        console.log('Anti AFK started');
    }
    else if (cmd === '!stopafk') {
        if (antiAfk) { clearInterval(antiAfk); antiAfk = null; }
        console.log('Anti AFK stopped');
    }
    else if (cmd === '!spin') {
        if (spinTask) { console.log('Already spinning'); return; }
        let yaw = 0;
        spinTask = setInterval(() => {
            yaw += 0.3;
            bot.look(yaw, 0, true);
        }, 100);
        console.log('Spin started');
    }
    else if (cmd === '!stopspin') {
        if (spinTask) { clearInterval(spinTask); spinTask = null; }
        console.log('Spin stopped');
    }
    else if (cmd === '!players') console.log(Object.keys(bot.players));
    else if (cmd === '!panic') stopEverything();

    // TƯƠNG TÁC KHÁC
    else if (cmd === '!swing') { bot.swingArm(); console.log('Left click'); }
    else if (cmd === '!use') { bot.activateItem(); console.log('Right click'); }
    else if (cmd === '!hp') {
        console.log(`Health: ${bot.health.toFixed(1)}/20 | Food: ${bot.food}/20`);
    }
    else if (cmd === '!help') {
        console.log(`\n=== DANH SÁCH LỆNH ===\n!pos | !goto | !follow | !unfollow | !stop\n!swing | !use | !hp | !antiafk | !spin\n`);
    }
});
