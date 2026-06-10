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

let bot; // Biến bot phải để ở ngoài để hàm lệnh có thể gọi được
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
        auth: 'microsoft', // Đổi thành 'offline' nếu server là crack
        username: 'letrungvinhv2@outlook.com', // Đổi thành tên nhân vật nếu dùng 'offline'
        version: '1.21.1',
        profilesFolder: './' // Lưu cache đăng nhập Microsoft để khỏi đăng nhập lại
    });

    bot.loadPlugin(pathfinder);

    bot.on('spawn', () => {
        // Cài đặt luật di chuyển mặc định để tránh crash khi dùng pathfinder
        const defaultMove = new Movements(bot);
        bot.pathfinder.setMovements(defaultMove);

        console.log('[Hệ Thống] Bot joined!');
    });

    bot.on('error', (err) => console.log('[Lỗi Bot]:', err));
    bot.on('kicked', (reason) => console.log('[Bot bị kick]:', reason));

    // CƠ CHẾ LÌ LỢM: TỰ KẾT NỐI LẠI KHI BỊ SẬP
    bot.on('end', (reason) => {
        console.log(`[Hệ Thống] Bot bị ngắt kết nối do: ${reason}`);
        console.log('[Hệ Thống] Đang tự động kết nối lại sau 30 giây...');
        
        stopEverything(); // Dừng mọi hoạt động để tránh lỗi

        setTimeout(() => {
            createMyBot(); 
        }, 30000); // Đợi 30 giây (30000ms) rồi chui vào lại
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

    if (antiAfk) {
        clearInterval(antiAfk);
        antiAfk = null;
    }

    if (spinTask) {
        clearInterval(spinTask);
        spinTask = null;
    }

    if (followTask) {
        clearInterval(followTask);
        followTask = null;
    }

    console.log('Stopped all tasks.');
}

// =========================
// COMMANDS (LỆNH ĐIỀU KHIỂN)
// =========================

rl.on('line', async (line) => {
    // Chặn gõ lệnh nếu bot chưa kết nối xong để tránh crash code
    if (!bot || !bot.entity) {
        console.log('[Hệ Thống] Bot chưa online, vui lòng đợi...');
        return;
    }

    const args = line.trim().split(' ');
    const cmd = args[0];

    // ==========================================
    // CHỨC NĂNG CŨ
    // ==========================================

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

    // ==========================================
    // CHỨC NĂNG MỚI
    // ==========================================

    // 1. CHUỘT TRÁI (Vung tay)
    else if (cmd === '!swing') {
        bot.swingArm();
        console.log('Swung arm (Left click)');
    }

    // 2. CHUỘT PHẢI (Dùng item đang cầm trên tay)
    else if (cmd === '!use') {
        bot.activateItem();
        console.log('Used held item (Right click)');
    }

    // 3. TƯƠNG TÁC CON TRỎ (Bấm vào khối đang nhìn thẳng)
    else if (cmd === '!click') {
        const block = bot.blockAtCursor(5); 
        if (block) {
            try {
                await bot.activateBlock(block);
                console.log(`Đã chuột phải (tương tác) vào: ${block.name}`);
            } catch (err) {
                console.log(`Không thể tương tác với ${block.name}:`, err.message);
            }
        } else {
            console.log('Bot không nhìn thấy block nào ở gần để bấm!');
        }
    }

    // 4. TỰ ĐỘNG TÌM VÀ GẠT CẦN (Sửa lỗi bấm hụt đèn đá đỏ)
    else if (cmd === '!lever') {
        const lever = bot.findBlock({
            matching: block => block.name === 'lever',
            maxDistance: 5
        });

        if (lever) {
            try {
                await bot.activateBlock(lever);
                console.log(`Đã gạt cần (lever) tại tọa độ: ${lever.position.x}, ${lever.position.y}, ${lever.position.z}`);
            } catch (err) {
                console.log('Không thể gạt cần:', err.message);
            }
        } else {
            console.log('Không tìm thấy cần gạt (lever) nào trong bán kính 5 block!');
        }
    }

    // 5. ĐẤM / TẤN CÔNG
    else if (cmd === '!attack') {
        const playerName = args[1];
        let target;
        if (playerName) {
            target = bot.players[playerName] ? bot.players[playerName].entity : null;
        } else {
            target = bot.nearestEntity(e => e.type === 'player' || e.type === 'hostile' || e.type === 'mob');
        }
        
        if (target) {
            bot.attack(target);
            console.log(`Attacked ${target.username || target.name}`);
        } else {
            console.log('No valid target to attack nearby');
        }
    }

    // 6. ĐÀO BLOCK
    else if (cmd === '!dig') {
        const x = parseInt(args[1]);
        const y = parseInt(args[2]);
        const z = parseInt(args[3]);
        if (isNaN(x) || isNaN(y) || isNaN(z)) return console.log('Usage: !dig x y z');
        
        const block = bot.blockAt(new Vec3(x, y, z));
        if (block && bot.canDigBlock(block)) {
            console.log(`Digging ${block.name}...`);
            try {
                await bot.dig(block);
                console.log('Finished digging!');
            } catch (err) {
                console.log('Failed to dig:', err.message);
            }
        } else {
            console.log('Cannot dig block at that position.');
        }
    }

    // 7. NGỪNG ĐÀO
    else if (cmd === '!stopdig') {
        bot.stopDigging();
        console.log('Stopped digging.');
    }

    // 8. XEM TÚI ĐỒ
    else if (cmd === '!inv') {
        const items = bot.inventory.items();
        if (items.length === 0) {
            console.log('Inventory is empty');
        } else {
            console.log('Inventory:');
            items.forEach(item => console.log(`- ${item.count}x ${item.name}`));
        }
    }

    // 9. CHỌN SLOT HOTBAR
    else if (cmd === '!slot') {
        const slot = parseInt(args[1]);
        if (slot >= 0 && slot <= 8) {
            bot.setQuickBarSlot(slot);
            console.log(`Switched to hotbar slot ${slot}`);
        } else {
            console.log('Slot must be between 0 and 8');
        }
    }

    // 10. CẦM ITEM LÊN TAY
    else if (cmd === '!equip') {
        const itemName = args[1];
        const item = bot.inventory.items().find(i => i.name.includes(itemName));
        if (item) {
            try {
                await bot.equip(item, 'hand');
                console.log(`Equipped ${item.name}`);
            } catch (err) {
                console.log('Cannot equip item:', err.message);
            }
        } else {
            console.log(`Item ${itemName} not found in inventory.`);
        }
    }

    // 11. BỎ ITEM XUỐNG
    else if (cmd === '!unequip') {
        try {
            await bot.unequip('hand');
            console.log('Unequipped item');
        } catch (err) {
            console.log('Cannot unequip:', err.message);
        }
    }

    // 12. VỨT ITEM
    else if (cmd === '!toss') {
        const itemName = args[1];
        const amount = parseInt(args[2]) || 1;
        const item = bot.inventory.items().find(i => i.name.includes(itemName));
        if (item) {
            try {
                await bot.toss(item.type, null, amount);
                console.log(`Tossed ${amount}x ${item.name}`);
            } catch (err) {
                console.log('Failed to toss:', err.message);
            }
        } else {
            console.log('Item not found to toss.');
        }
    }

    // 13. VỨT HẾT ĐỒ
    else if (cmd === '!tossall') {
        const items = bot.inventory.items();
        for (const item of items) {
            await bot.tossStack(item);
        }
        console.log('Tossed all items.');
    }

    // 14. ĂN UỐNG
    else if (cmd === '!eat') {
        try {
            await bot.consume();
            console.log('Ate held item.');
        } catch (err) {
            console.log('Cannot eat this item:', err.message);
        }
    }

    // 15. XEM MÁU VÀ ĐỘ ĐÓI
    else if (cmd === '!hp') {
        console.log(`Health: ${bot.health.toFixed(1)}/20 | Food: ${bot.food}/20`);
    }

    // 16. XEM CẤP ĐỘ KINH NGHIỆM
    else if (cmd === '!xp') {
        console.log(`Level: ${bot.experience.level} | Progress: ${(bot.experience.progress * 100).toFixed(1)}%`);
    }

    // 17. NGỦ
    else if (cmd === '!sleep') {
        const bed = bot.findBlock({ matching: block => bot.isABed(block) });
        if (bed) {
            try {
                await bot.sleep(bed);
                console.log('Sleeping...');
            } catch (err) {
                console.log('Cannot sleep:', err.message);
            }
        } else {
            console.log('No bed found nearby.');
        }
    }

    // 18. THỨC DẬY
    else if (cmd === '!wakeup') {
        try {
            await bot.wake();
            console.log('Woke up.');
        } catch (err) {
            console.log('Not sleeping.', err.message);
        }
    }

    // 19. LÊN XE / CƯỠI THÚ
    else if (cmd === '!mount') {
        const vehicle = bot.nearestEntity((entity) => ['boat', 'minecart', 'horse', 'pig', 'donkey'].includes(entity.name));
        if (vehicle) {
            bot.mount(vehicle);
            console.log('Mounted ' + vehicle.name);
        } else {
            console.log('No mountable entity nearby.');
        }
    }

    // 20. XUỐNG XE
    else if (cmd === '!dismount') {
        bot.dismount();
        console.log('Dismounted.');
    }

    // 21. KIỂM TRA THỜI GIAN
    else if (cmd === '!time') {
        console.log(`Time of day: ${bot.time.timeOfDay} ticks`);
    }

    // 22. XEM THÔNG TIN BLOCK
    else if (cmd === '!block') {
        const x = parseInt(args[1]);
        const y = parseInt(args[2]);
        const z = parseInt(args[3]);
        if (isNaN(x) || isNaN(y) || isNaN(z)) return console.log('Usage: !block x y z');
        
        const block = bot.blockAt(new Vec3(x, y, z));
        if (block) {
            console.log(`Block at ${x}, ${y}, ${z} is: ${block.name}`);
        } else {
            console.log('Block not loaded.');
        }
    }

    // HELP MENU
    else if (cmd === '!help') {
        console.log(`
=== DANH SÁCH LỆNH ===
Di chuyển & Định vị:
!pos | !goto <x> <y> <z> | !look <player> | !lookpos <x> <y> <z>
!follow <player> | !unfollow | !forward | !back | !left | !right
!jump | !sneak | !sprint | !stop

Tương tác Máy Farm & Cơ chế:
!swing (Vung tay)
!use (Dùng item trên tay)
!lever (Tự quét tìm và gạt CẦN GẠT gần nhất)
!click (Nhấn chuột phải vào block đang ngắm tâm)
!attack [player] (Tấn công mục tiêu gần nhất)
!dig <x> <y> <z> (Đào block) | !stopdig
!block <x> <y> <z> (Xem thông tin block)

Túi đồ & Trạng thái:
!inv | !slot <0-8> | !equip <itemName> | !unequip
!toss <itemName> [số lượng] | !tossall
!eat | !hp | !xp

Tiện ích hệ thống:
!say <text> | !command <cmd>
!antiafk | !stopafk | !spin | !stopspin
!sleep | !wakeup | !mount | !dismount
!time | !players | !panic (Dừng khẩn cấp mọi hoạt động)
`);
    }
});
