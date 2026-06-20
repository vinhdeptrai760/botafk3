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
// 3. HÀM KHỞI TẠO BOT (CÓ AUTO-RECONNECT)
// ==========================================
function createMyBot() {
    console.log('[Hệ Thống] Đang tiến hành kết nối vào server...');
    
    bot = mineflayer.createBot({
        host: 'donutsmp.net',
        port: 25565,
        auth: 'microsoft', 
        username: 'letrungvinhv2@outlook.com', 
        // 🛠️ FIX 1: Thử bỏ qua việc ép buộc version 1.21.1 để bot tự động tương thích với Proxy của DonutSMP
        // version: '1.21.1', 
        profilesFolder: './auth-cache',
        hideErrors: false // Để hiện chi tiết nếu có lỗi giao thức
    });

    bot.loadPlugin(pathfinder);

    // 🛠️ FIX 2: TỰ ĐỘNG CHẤP NHẬN RESOURCE PACK (Quan trọng nhất với server quốc tế)
    bot.on('resourcePack', (url, hash) => {
        console.log('[Hệ Thống] Server yêu cầu Resource Pack, đang tự động đồng ý...');
        bot.acceptResourcePack();
    });

    bot.on('spawn', () => {
        // 🛠️ FIX 3: Trì hoãn việc cài đặt di chuyển 1 giây để tránh bị Anti-cheat quét gói tin quá sớm
        setTimeout(() => {
            if (!bot || !bot.pathfinder) return;
            const defaultMove = new Movements(bot);
            bot.pathfinder.setMovements(defaultMove);
            console.log('[Hệ Thống] Bot joined và đã kích hoạt hệ thống định vị ổn định!');
        }, 1000);
    });

    bot.on('error', (err) => {
        // Giảm bớt log spam nếu là lỗi ECONNRESET cũ đang tự kết nối lại
        if (err.code === 'ECONNRESET') {
            console.log('[Lỗi Bot]: Server chặn kết nối mạng (ECONNRESET).');
        } else {
            console.log('[Lỗi Bot]:', err);
        }
    });
    
    bot.on('kicked', (reason) => console.log('[Bot bị kick]:', reason));

    // CƠ CHẾ TỰ KẾT NỐI LẠI
    bot.on('end', (reason) => {
        console.log(`[Hệ Thống] Bot bị ngắt kết nối do: ${reason}`);
        console.log('[Hệ Thống] Đang tự động kết nối lại sau 30 giây...');
        
        stopEverything(); 

        setTimeout(() => {
            createMyBot(); 
        }, 30000); 
    });
}

// Chạy bot lần đầu tiên
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
// COMMANDS (LỆNH ĐIỀU KHIỂN)
// =========================
rl.on('line', async (line) => {
    if (!bot || !bot.entity) {
        console.log('[Hệ Thống] Bot chưa online, vui lòng đợi...');
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

    // CHỨC NĂNG TƯƠNG TÁC
    else if (cmd === '!swing') {
        bot.swingArm();
        console.log('Swung arm (Left click)');
    }
    else if (cmd === '!use') {
        bot.activateItem();
        console.log('Used held item (Right click)');
    }
    else if (cmd === '!click') {
        const block = bot.blockAtCursor(5); 
        if (block) {
            try {
                await bot.activateBlock(block);
                console.log(`Đã tương tác với: ${block.name}`);
            } catch (err) {
                console.log(`Không thể tương tác:`, err.message);
            }
        }
    }
    else if (cmd === '!lever') {
        const lever = bot.findBlock({ matching: block => block.name === 'lever', maxDistance: 5 });
        if (lever) {
            try { await bot.activateBlock(lever); console.log('Đã gạt cần!'); } catch (err) {}
        }
    }
    else if (cmd === '!attack') {
        const target = bot.nearestEntity(e => e.type === 'player' || e.type === 'hostile' || e.type === 'mob');
        if (target) { bot.attack(target); console.log('Attacked target'); }
    }
    else if (cmd === '!dig') {
        const x = parseInt(args[1]), y = parseInt(args[2]), z = parseInt(args[3]);
        const block = bot.blockAt(new Vec3(x, y, z));
        if (block && bot.canDigBlock(block)) {
            try { await bot.dig(block); console.log('Finished digging!'); } catch (err) {}
        }
    }
    else if (cmd === '!stopdig') bot.stopDigging();
    else if (cmd === '!inv') {
        const items = bot.inventory.items();
        items.forEach(item => console.log(`- ${item.count}x ${item.name}`));
    }
    else if (cmd === '!slot') {
        const slot = parseInt(args[1]);
        if (slot >= 0 && slot <= 8) bot.setQuickBarSlot(slot);
    }
    else if (cmd === '!hp') {
        console.log(`Health: ${bot.health.toFixed(1)}/20 | Food: ${bot.food}/20`);
    }

    // HELP MENU
    else if (cmd === '!help') {
        console.log(`\n=== DANH SÁCH LỆNH ===\n!pos | !goto | !follow | !unfollow | !stop\n!swing | !use | !click | !lever | !attack | !dig\n!inv | !slot | !hp | !antiafk | !spin\n`);
    }
});
