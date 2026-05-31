// 包含完整前端页面的 HTML 模板字符串
// 注意：前端代码中的 `${}` 和反引号已被安全转义，以确保 Worker 能正确解析
const HTML_CONTENT = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eSIM 资产与保号看板</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" rel="stylesheet">
    <style>
        body {
            background: linear-gradient(-45deg, #ee7752, #e73c7e, #23a6d5, #23d5ab);
            background-size: 400% 400%;
            animation: gradient 15s ease infinite;
            min-height: 100vh;
        }
        @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }
        .glass-panel {
            background: rgba(255, 255, 255, 0.25);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            border: 1px solid rgba(255, 255, 255, 0.4);
            box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.5);
            transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .glass-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 12px 24px rgba(0,0,0,0.1);
        }
        .modal-enter { opacity: 0; transform: scale(0.9); }
        .modal-enter-active { opacity: 1; transform: scale(1); transition: all 0.3s ease; }
    </style>
</head>
<body class="text-gray-800 font-sans p-4 md:p-8 relative">

    <!-- 登录界面 (默认显示，未授权时拦截) -->
    <div id="login-container" class="max-w-md mx-auto glass-panel rounded-3xl p-8 md:p-10 mt-16 md:mt-32 text-center transition-all">
        <div class="w-20 h-20 bg-white/50 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
            <i class="fa-solid fa-shield-halved text-4xl text-blue-600"></i>
        </div>
        <h2 class="text-3xl font-extrabold text-gray-900 mb-2">安全验证</h2>
        <p class="text-gray-600 mb-8 text-sm font-medium">为保护您的卡片资产，请获取验证码登录。</p>
        
        <div class="mb-6 relative">
            <input type="text" id="authCode" placeholder="输入 6 位数验证码" maxlength="6" class="w-full px-4 py-4 rounded-xl border border-gray-300/50 text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/70 shadow-inner placeholder-gray-400 placeholder:tracking-normal placeholder:text-base">
        </div>
        
        <div class="flex flex-col gap-4 mt-8">
            <button id="loginBtn" onclick="verifyCode()" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2">
                <i class="fa-solid fa-arrow-right-to-bracket"></i> 登录面板
            </button>
            <button id="sendCodeBtn" onclick="sendAuthCode()" class="w-full bg-white/60 hover:bg-white/80 text-blue-700 font-bold py-3.5 px-4 rounded-xl border border-blue-200/50 transition-colors flex items-center justify-center gap-2">
                <i class="fa-brands fa-telegram text-xl"></i> 向 TG 机器人获取验证码
            </button>
        </div>
    </div>

    <!-- 主界面容器 (默认隐藏，登录成功后显示) -->
    <div id="main-container" class="max-w-6xl mx-auto glass-panel rounded-3xl p-6 md:p-10 mt-4 md:mt-8 hidden">
        <!-- 头部信息 -->
        <div class="flex flex-col md:flex-row justify-between items-center mb-10 border-b border-white/50 pb-6 gap-4">
            <div>
                <h1 class="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                    <i class="fa-solid fa-sim-card text-blue-600"></i>
                    eSIM 保号看板
                </h1>
                <p class="text-gray-700 mt-2 font-medium">自动监控卡片有效期，15天内触发 Telegram 提醒。</p>
            </div>
            <div class="flex gap-3 items-center flex-wrap justify-center">
                <span class="text-sm bg-white/50 px-4 py-2 rounded-full font-semibold shadow-sm hidden md:inline-block">
                    今日：<span id="current-date" class="text-blue-700">...</span>
                </span>
                <button onclick="openModal()" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-full font-bold shadow-lg transition-colors flex items-center gap-2">
                    <i class="fa-solid fa-plus"></i> 添加号码
                </button>
                <button onclick="logout()" class="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2.5 rounded-full font-bold shadow-sm transition-colors flex items-center gap-2 border border-red-200" title="退出登录">
                    <i class="fa-solid fa-right-from-bracket"></i>
                </button>
            </div>
        </div>

        <!-- 状态统计 -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10" id="stats-container">
            <!-- JS 动态注入 -->
        </div>

        <!-- 卡片列表容器 -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="esim-container">
            <div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg" id="loading-text">
                <i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在读取数据...
            </div>
        </div>
    </div>

    <!-- 添加/编辑卡片模态框 -->
    <div id="addModal" class="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 hidden flex items-center justify-center p-4">
        <div class="glass-card w-full max-w-md rounded-2xl p-6 shadow-2xl relative transition-all duration-300 transform scale-95 opacity-0" id="modalContent">
            <button onclick="closeModal()" class="absolute top-4 right-4 text-gray-500 hover:text-red-500 text-xl">
                <i class="fa-solid fa-xmark"></i>
            </button>
            <h3 class="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2" id="modalTitle">
                <i class="fa-solid fa-file-circle-plus text-blue-600"></i> 新增 eSIM
            </h3>
            
            <form id="addForm" onsubmit="submitForm(event)">
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">卡片名称 (必填)</label>
                    <input type="text" id="simName" required placeholder="例如：KnowRoaming" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">手机号码带区号 (选填)</label>
                    <input type="text" id="simNumber" placeholder="例如：+1 234 567 8900" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-4">
                    <label class="block text-gray-700 text-sm font-bold mb-2">保号周期 (单位：天，必填)</label>
                    <input type="number" id="simCycle" required placeholder="例如：180" class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <div class="mb-6">
                    <label class="block text-gray-700 text-sm font-bold mb-2">本次到期日 (必填)</label>
                    <input type="date" id="simExpire" required class="w-full px-4 py-2 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white/80">
                </div>
                <button type="submit" id="submitBtn" class="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl shadow-md transition-colors">
                    保存并监控
                </button>
            </form>
        </div>
    </div>

    <script>
        // API 路由前缀
        const WORKER_API_URL = "/api/esims";
        let esimData = []; 
        let countdownInterval;
        let editingId = null; // 用于记录当前正在编辑的卡片ID

        // ================= 国旗字典配置 =================
        const countryFlags = [
            { prefix: "+1", flag: "🇺🇸/🇨🇦" },   // 美国/加拿大通用
            { prefix: "+44", flag: "🇬🇧" },  // 英国
            { prefix: "+86", flag: "🇨🇳" },  // 中国大陆
            { prefix: "+852", flag: "🇭🇰" }, // 香港
            { prefix: "+853", flag: "🇲🇴" }, // 澳门
            { prefix: "+886", flag: "🇹🇼" }, // 台湾
            { prefix: "+81", flag: "🇯🇵" },  // 日本
            { prefix: "+82", flag: "🇰🇷" },  // 韩国
            { prefix: "+65", flag: "🇸🇬" },  // 新加坡
            { prefix: "+60", flag: "🇲🇾" },  // 马来西亚
            { prefix: "+61", flag: "🇦🇺" },  // 澳大利亚
            { prefix: "+64", flag: "🇳🇿" },  // 新西兰
            { prefix: "+66", flag: "🇹🇭" },  // 泰国
            { prefix: "+62", flag: "🇮🇩" },  // 印尼
            { prefix: "+63", flag: "🇵🇭" },  // 菲律宾
            { prefix: "+84", flag: "🇻🇳" },  // 越南
            { prefix: "+91", flag: "🇮🇳" },  // 印度
            { prefix: "+971", flag: "🇦🇪" }, // 阿联酋
            { prefix: "+33", flag: "🇫🇷" },  // 法国
            { prefix: "+49", flag: "🇩🇪" },  // 德国
            { prefix: "+39", flag: "🇮🇹" },  // 意大利
            { prefix: "+34", flag: "🇪🇸" },  // 西班牙
            { prefix: "+7", flag: "🇷🇺/🇰🇿" },// 俄罗斯/哈萨克斯坦
            { prefix: "+380", flag: "🇺🇦" }, // 乌克兰
            { prefix: "+90", flag: "🇹🇷" },  // 土耳其
            { prefix: "+55", flag: "🇧🇷" },  // 巴西
            { prefix: "+52", flag: "🇲🇽" },  // 墨西哥
            { prefix: "+27", flag: "🇿🇦" },  // 南非
            { prefix: "+234", flag: "🇳🇬" }, // 尼日利亚
            // ===== 新增更多国家 =====
            { prefix: "+31", flag: "🇳🇱" },  // 荷兰
            { prefix: "+32", flag: "🇧🇪" },  // 比利时
            { prefix: "+41", flag: "🇨🇭" },  // 瑞士
            { prefix: "+43", flag: "🇦🇹" },  // 奥地利
            { prefix: "+46", flag: "🇸🇪" },  // 瑞典
            { prefix: "+47", flag: "🇳🇴" },  // 挪威
            { prefix: "+48", flag: "🇵🇱" },  // 波兰
            { prefix: "+45", flag: "🇩🇰" },  // 丹麦
            { prefix: "+358", flag: "🇫🇮" }, // 芬兰
            { prefix: "+351", flag: "🇵🇹" }, // 葡萄牙
            { prefix: "+30", flag: "🇬🇷" },  // 希腊
            { prefix: "+353", flag: "🇮🇪" }, // 爱尔兰
            { prefix: "+966", flag: "🇸🇦" }, // 沙特
            { prefix: "+972", flag: "🇮🇱" }, // 以色列
            { prefix: "+92", flag: "🇵🇰" },  // 巴基斯坦
            { prefix: "+880", flag: "🇧🇩" }, // 孟加拉
            { prefix: "+94", flag: "🇱🇰" },  // 斯里兰卡
            { prefix: "+20", flag: "🇪🇬" },  // 埃及
            { prefix: "+254", flag: "🇰🇪" }, // 肯尼亚
            { prefix: "+54", flag: "🇦🇷" },  // 阿根廷
            { prefix: "+56", flag: "🇨🇱" },  // 智利
            { prefix: "+57", flag: "🇨🇴" },  // 哥伦比亚
            { prefix: "+51", flag: "🇵🇪" },  // 秘鲁
            { prefix: "+58", flag: "🇻🇪" },  // 委内瑞拉
            { prefix: "+370", flag: "🇱🇹" }, // 立陶宛
            { prefix: "+371", flag: "🇱🇻" }, // 拉脱维亚
            { prefix: "+372", flag: "🇪🇪" }, // 爱沙尼亚
            { prefix: "+995", flag: "🇬🇪" }, // 格鲁吉亚
            { prefix: "+374", flag: "🇦🇲" }, // 亚美尼亚
            { prefix: "+381", flag: "🇷🇸" }, // 塞尔维亚
            { prefix: "+359", flag: "🇧🇬" }, // 保加利亚
            { prefix: "+357", flag: "🇨🇾" }  // 塞浦路斯
        ];

        // 智能国旗解析函数 (支持过滤各种特殊符号)
        function getCountryFlag(numberStr) {
            if (!numberStr) return "📞"; 
            // 过滤空格、括号、破折号和点，例如 +1 (234) 567-8900 变为 +12345678900
            const cleanNumber = numberStr.replace(/[\\s\\-\\(\\)\\.]/g, '');
            if (!cleanNumber.startsWith("+")) return "🌍"; 
            
            // 按区号长度降序排列，确保优先匹配长区号
            const sortedFlags = countryFlags.sort((a, b) => b.prefix.length - a.prefix.length);
            for (let item of sortedFlags) {
                if (cleanNumber.startsWith(item.prefix)) {
                    return item.flag;
                }
            }
            return "🌍"; 
        }

        document.getElementById('current-date').innerText = new Date().toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
        
        // 页面加载时，检查是否已有有效 token
        window.onload = () => {
            if (localStorage.getItem('esim_auth_token')) {
                fetchEsimData();
            }
        };

        // 统一获取携带 Auth 头的请求配置
        function getAuthHeaders() {
            return {
                'Content-Type': 'application/json',
                'Authorization': localStorage.getItem('esim_auth_token') || ''
            };
        }

        // ================= 安全验证相关功能 =================
        async function sendAuthCode() {
            const btn = document.getElementById('sendCodeBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 发送中...';
            
            try {
                const response = await fetch('/api/auth/send', { method: 'POST' });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    let timeLeft = 60;
                    btn.innerHTML = \`<i class="fa-solid fa-clock mr-2"></i> \${timeLeft} 秒后可重发\`;
                    countdownInterval = setInterval(() => {
                        timeLeft--;
                        if (timeLeft <= 0) {
                            clearInterval(countdownInterval);
                            btn.disabled = false;
                            btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
                        } else {
                            btn.innerHTML = \`<i class="fa-solid fa-clock mr-2"></i> \${timeLeft} 秒后可重发\`;
                        }
                    }, 1000);
                } else {
                    alert("发送失败: " + (data.message || "后端未配置机器人信息"));
                    btn.disabled = false;
                    btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
                }
            } catch (e) {
                alert("网络错误，发送失败");
                btn.disabled = false;
                btn.innerHTML = '<i class="fa-brands fa-telegram text-xl mr-2"></i> 向 TG 机器人获取验证码';
            }
        }

        async function verifyCode() {
            const codeInput = document.getElementById('authCode').value.trim();
            if (!codeInput || codeInput.length !== 6) return alert("请输入完整的 6 位数字验证码");
            
            const btn = document.getElementById('loginBtn');
            const originalHTML = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i> 验证中...';
            
            try {
                const response = await fetch('/api/auth/verify', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code: codeInput })
                });
                const data = await response.json();
                
                if (response.ok && data.success) {
                    localStorage.setItem('esim_auth_token', data.token);
                    document.getElementById('authCode').value = '';
                    fetchEsimData();
                } else {
                    alert("登录失败: " + (data.message || "验证码错误或已过期"));
                    btn.disabled = false;
                    btn.innerHTML = originalHTML;
                }
            } catch (e) {
                alert("网络错误，验证失败");
                btn.disabled = false;
                btn.innerHTML = originalHTML;
            }
        }

        function logout() {
            localStorage.removeItem('esim_auth_token');
            document.getElementById('login-container').classList.remove('hidden');
            document.getElementById('main-container').classList.add('hidden');
        }

        // ================= 核心业务相关功能 =================
        async function fetchEsimData() {
            const container = document.getElementById('esim-container');
            container.innerHTML = \`<div class="col-span-full text-center py-10 text-gray-700 font-medium text-lg"><i class="fa-solid fa-spinner fa-spin mr-2"></i> 正在加载数据...</div>\`;
            
            try {
                const response = await fetch(WORKER_API_URL, { headers: getAuthHeaders() });
                
                if (response.status === 401) {
                    logout();
                    return;
                }

                if (!response.ok) throw new Error("网络请求失败");
                
                esimData = await response.json();
                
                document.getElementById('login-container').classList.add('hidden');
                document.getElementById('main-container').classList.remove('hidden');
                
                renderCards(esimData);
            } catch (error) {
                console.error("加载失败:", error);
                container.innerHTML = \`
                    <div class="col-span-full text-center py-10">
                        <i class="fa-solid fa-triangle-exclamation text-4xl text-red-500 mb-3"></i>
                        <h3 class="text-xl font-bold text-gray-800">获取数据失败</h3>
                        <p class="text-gray-600 mt-2">网络异常，请重试。</p>
                    </div>\`;
            }
        }

        function renderCards(esims) {
            const container = document.getElementById('esim-container');
            const statsContainer = document.getElementById('stats-container');
            container.innerHTML = ''; 

            let safeCount = 0;
            let warningCount = 0;
            let dangerCount = 0;
            
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if(esims.length === 0) {
                container.innerHTML = \`<div class="col-span-full text-center py-16 text-gray-500"><i class="fa-solid fa-box-open text-4xl mb-3"></i><p>还没有添加任何号码，点击右上角添加吧！</p></div>\`;
            }

            esims.sort((a, b) => new Date(a.expireDate) - new Date(b.expireDate));

            esims.forEach(sim => {
                const expDate = new Date(sim.expireDate);
                expDate.setHours(0, 0, 0, 0);
                const diffTime = expDate - today;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let statusColor = "bg-green-500";
                let statusText = "状态安全";
                let badgeClass = "bg-green-100 text-green-800";
                let icon = "fa-check-circle text-green-500";

                if (diffDays <= 0) {
                    statusColor = "bg-gray-500";
                    statusText = diffDays === 0 ? "今日到期" : "已过期";
                    badgeClass = "bg-gray-100 text-gray-800";
                    icon = "fa-times-circle text-gray-500";
                    dangerCount++;
                } else if (diffDays <= 15) {
                    statusColor = "bg-red-500";
                    statusText = "即将过期";
                    badgeClass = "bg-red-100 text-red-800";
                    icon = "fa-triangle-exclamation text-red-500";
                    dangerCount++;
                } else if (diffDays <= 45) {
                    statusColor = "bg-yellow-400";
                    statusText = "建议关注";
                    badgeClass = "bg-yellow-100 text-yellow-800";
                    icon = "fa-bell text-yellow-500";
                    warningCount++;
                } else {
                    safeCount++;
                }

                let percent = Math.min(Math.max((diffDays / 365) * 100, 0), 100);
                
                const flagEmoji = getCountryFlag(sim.number);

                const cardHTML = \`
                    <div class="glass-card rounded-2xl p-6 relative overflow-hidden group">
                        
                        <!-- 操作按钮组 (移动端常显，PC端悬浮，彻底解决重叠) -->
                        <div class="absolute top-4 right-4 flex gap-1.5 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-all duration-300 z-20 bg-white/80 p-1.5 rounded-full backdrop-blur-md border border-white/60 shadow-sm">
                            <!-- 编辑按钮 -->
                            <button onclick="openEditModal('\${sim.id}')" class="text-green-600 hover:text-white hover:bg-green-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="编辑卡片资料">
                                <i class="fa-solid fa-pen text-sm"></i>
                            </button>

                            <!-- 一键续期按钮 -->
                            <button onclick="renewEsim('\${sim.id}', \${sim.cycle || 0})" class="text-blue-600 hover:text-white hover:bg-blue-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="一键续期（按周期顺延）">
                                <i class="fa-solid fa-rotate-right text-sm"></i>
                            </button>

                            <!-- 删除按钮 -->
                            <button onclick="deleteEsim('\${sim.id}')" class="text-red-500 hover:text-white hover:bg-red-500 bg-white w-8 h-8 rounded-full flex items-center justify-center transition-colors shadow-sm" title="删除号码">
                                <i class="fa-solid fa-trash-can text-sm"></i>
                            </button>
                        </div>

                        <!-- 头部信息重构：状态标签紧贴标题，防止和右侧按钮重叠 -->
                        <div class="mb-6 pr-28 lg:pr-0">
                            <div class="flex items-center gap-3 mb-2 flex-wrap">
                                <h2 class="text-xl font-bold text-gray-900 truncate max-w-[120px] md:max-w-[160px]">\${sim.name}</h2>
                                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-bold shadow-sm whitespace-nowrap \${badgeClass}">
                                    <i class="fa-solid \${icon} mr-1"></i>\${statusText}
                                </span>
                            </div>
                            <p class="text-gray-600 font-mono text-sm flex items-center gap-1.5">
                                <span class="text-lg">\${flagEmoji}</span>
                                <span>\${sim.number || '未登记号码'}</span>
                            </p>
                        </div>
                        
                        <div class="mt-4">
                            <div class="flex justify-between text-sm font-semibold mb-2">
                                <span class="text-gray-700">剩余时间</span>
                                <span class="text-gray-900 font-bold \${diffDays <= 15 && diffDays > 0 ? 'text-red-600 animate-pulse' : ''}">\${diffDays < 0 ? '0' : diffDays} 天</span>
                            </div>
                            <div class="w-full bg-gray-200/60 rounded-full h-3 mb-3 shadow-inner">
                                <div class="\${statusColor} h-3 rounded-full shadow-sm transition-all duration-1000" style="width: \${percent}%"></div>
                            </div>
                            <div class="flex justify-between text-xs text-gray-500 font-medium">
                                <span><i class="fa-solid fa-arrows-rotate mr-1"></i>周期: \${sim.cycle || '-'} 天</span>
                                <span>到期日: \${sim.expireDate}</span>
                            </div>
                        </div>
                    </div>
                \`;
                container.innerHTML += cardHTML;
            });

            statsContainer.innerHTML = \`
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-green-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">安全卡片 (>45天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${safeCount}</p>
                    </div>
                    <i class="fa-solid fa-shield-check text-4xl text-green-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-yellow-400">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">建议关注 (<45天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${warningCount}</p>
                    </div>
                    <i class="fa-solid fa-clock text-4xl text-yellow-200"></i>
                </div>
                <div class="glass-card rounded-2xl p-5 flex items-center justify-between border-l-4 border-l-red-500">
                    <div>
                        <p class="text-gray-500 text-sm font-bold uppercase">告警/过期 (<=15天)</p>
                        <p class="text-3xl font-black text-gray-800 mt-1">\${dangerCount}</p>
                    </div>
                    <i class="fa-solid fa-siren-on text-4xl text-red-200"></i>
                </div>
            \`;
        }

        // 保存或修改数据
        async function submitForm(e) {
            e.preventDefault();
            const btn = document.getElementById('submitBtn');
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-2"></i>保存中...';
            btn.disabled = true;

            const payload = {
                name: document.getElementById('simName').value,
                number: document.getElementById('simNumber').value,
                cycle: parseInt(document.getElementById('simCycle').value) || 0,
                expireDate: document.getElementById('simExpire').value
            };

            if (editingId) {
                payload.id = editingId;
            }

            try {
                const response = await fetch(WORKER_API_URL, {
                    method: editingId ? 'PUT' : 'POST', 
                    headers: getAuthHeaders(),
                    body: JSON.stringify(payload)
                });
                
                if (response.status === 401) { logout(); return; }
                if (response.ok) {
                    closeModal();
                    await fetchEsimData(); 
                } else {
                    alert("保存失败，请检查数据。");
                }
            } catch (error) {
                alert("网络错误，保存失败。");
            } finally {
                btn.innerHTML = '保存并监控';
                btn.disabled = false;
            }
        }

        // 一键续期
        async function renewEsim(id, cycle) {
            if (!cycle || cycle === 0) {
                alert("该卡片未设置保号周期，无法自动计算日期。请直接点击编辑修改。");
                return;
            }
            if (!confirm("确定已保号并一键续期吗？\\n\\n系统将以【今天】为基准，往后顺延 " + cycle + " 天作为新的到期日。")) return;
            
            const newDate = new Date();
            newDate.setDate(newDate.getDate() + parseInt(cycle));
            const year = newDate.getFullYear();
            const month = String(newDate.getMonth() + 1).padStart(2, '0');
            const day = String(newDate.getDate()).padStart(2, '0');
            const newExpireStr = year + '-' + month + '-' + day;

            try {
                const response = await fetch(WORKER_API_URL, {
                    method: 'PUT',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ id: id, expireDate: newExpireStr })
                });
                
                if (response.status === 401) { logout(); return; }
                if (response.ok) {
                    await fetchEsimData(); 
                } else {
                    alert("续期失败。");
                }
            } catch (error) {
                alert("网络错误，续期失败。");
            }
        }

        // 删除卡片
        async function deleteEsim(id) {
            if (!confirm("确定要删除这个号码记录吗？")) return;
            
            try {
                const response = await fetch(WORKER_API_URL, {
                    method: 'DELETE',
                    headers: getAuthHeaders(),
                    body: JSON.stringify({ id: id })
                });
                
                if (response.status === 401) { logout(); return; }
                if (response.ok) {
                    await fetchEsimData(); 
                } else {
                    alert("删除失败。");
                }
            } catch (error) {
                alert("网络错误，删除失败。");
            }
        }

        // 打开新增弹窗
        function openModal() {
            editingId = null;
            document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-file-circle-plus text-blue-600"></i> 新增 eSIM';
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            document.getElementById('addForm').reset(); 
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        // 打开编辑弹窗
        function openEditModal(id) {
            const sim = esimData.find(s => s.id === id);
            if (!sim) return;
            
            editingId = id;
            document.getElementById('modalTitle').innerHTML = '<i class="fa-solid fa-pen-to-square text-green-600"></i> 编辑 eSIM';
            
            document.getElementById('simName').value = sim.name || '';
            document.getElementById('simNumber').value = sim.number || '';
            document.getElementById('simCycle').value = sim.cycle || '';
            document.getElementById('simExpire').value = sim.expireDate || '';

            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            
            modal.classList.remove('hidden');
            setTimeout(() => {
                content.classList.remove('scale-95', 'opacity-0');
                content.classList.add('scale-100', 'opacity-100');
            }, 10);
        }

        // 关闭弹窗
        function closeModal() {
            const modal = document.getElementById('addModal');
            const content = document.getElementById('modalContent');
            
            content.classList.remove('scale-100', 'opacity-100');
            content.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
                editingId = null;
            }, 300); 
        }
    </script>
</body>
</html>`;

export default {
  // 核心入口：拦截所有网络请求并进行路由分发
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    
    // 设置跨域请求头
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    // 预检请求直接放行
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    // 路由 1：如果访问的是根目录 (网址首页)，直接返回 HTML 网页
    if (path === "/" || path === "/index.html") {
      return new Response(HTML_CONTENT, {
        headers: { "Content-Type": "text/html;charset=UTF-8" }
      });
    }

    // ==========================================
    // 💡 优先从环境变量读，读不到就从 KV 数据库读
    // ==========================================
    let tgToken = env.TG_BOT_TOKEN;
    let tgChat = env.TG_CHAT_ID;
    
    try {
      if (!tgToken) tgToken = await env.ESIM_DB.get("TG_BOT_TOKEN");
      if (!tgChat) tgChat = await env.ESIM_DB.get("TG_CHAT_ID");
    } catch (e) {
      // 防止 KV 没绑定报错
    }

    // 路由 2：触发发送动态验证码到 Telegram
    if (path === "/api/auth/send" && request.method === "POST") {
      try {
        if (!tgToken || !tgChat) {
          let missingVars = [];
          if (!tgToken) missingVars.push("TG_BOT_TOKEN");
          if (!tgChat) missingVars.push("TG_CHAT_ID");
          return new Response(JSON.stringify({ 
              success: false, 
              message: `环境缺失：缺少 ${missingVars.join(' 和 ')}。请前往 Cloudflare 的 KV 数据库 (esim_db) 中手动添加这两个键值对即可彻底解决！` 
          }), { status: 500, headers: corsHeaders });
        }
        
        // 生成 6 位纯数字验证码
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        
        // 【防御措施】将验证码存入 KV，并重置错误尝试次数为 0
        await env.ESIM_DB.put("admin_auth_code", code, { expirationTtl: 300 });
        await env.ESIM_DB.put("admin_auth_attempts", "0", { expirationTtl: 300 }); 

        // 发送 TG 消息
        const text = `🔐 <b>【eSIM 看板安全验证】</b>\n\n有人正在尝试登录您的网页版数据面板。\n\n您的动态登录验证码是：<code>${code}</code>\n\n<i>(该验证码 5 分钟内有效。如非本人操作，请忽略，系统已开启防爆破保护)</i>`;
        const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
        const tgRes = await fetch(tgUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: tgChat, text: text, parse_mode: "HTML" })
        });

        if (tgRes.ok) {
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } else {
          return new Response(JSON.stringify({ success: false, message: "TG 消息发送失败，可能 Bot 被拉黑或未激活" }), { status: 500, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: err.message }), { status: 500, headers: corsHeaders });
      }
    }

    // 路由 3：校验验证码并颁发 Session Token
    if (path === "/api/auth/verify" && request.method === "POST") {
      try {
        const { code } = await request.json();
        const storedCode = await env.ESIM_DB.get("admin_auth_code");
        
        // 【防爆破拦截】判断失败次数是否达到 5 次
        let attempts = parseInt(await env.ESIM_DB.get("admin_auth_attempts")) || 0;
        if (attempts >= 5) {
            await env.ESIM_DB.delete("admin_auth_code"); // 强制销毁现有验证码
            return new Response(JSON.stringify({ success: false, message: "错误次数过多，为保障安全，验证码已强制作废。请重新获取！" }), { status: 403, headers: corsHeaders });
        }

        if (!storedCode) {
            return new Response(JSON.stringify({ success: false, message: "请先获取验证码或验证码已过期" }), { status: 400, headers: corsHeaders });
        }
        
        if (code && storedCode === code.toString()) {
          // 验证通过
          const token = crypto.randomUUID();
          await env.ESIM_DB.put("session_token_" + token, "valid", { expirationTtl: 2592000 });
          await env.ESIM_DB.delete("admin_auth_code");
          await env.ESIM_DB.delete("admin_auth_attempts"); // 清理错误计数器
          
          return new Response(JSON.stringify({ success: true, token: token }), { headers: corsHeaders });
        } else {
          // 【防爆破惩罚】累加错误次数，并制造 1 秒钟的假延迟，大幅减缓爆破脚本的速度
          attempts++;
          await env.ESIM_DB.put("admin_auth_attempts", attempts.toString(), { expirationTtl: 300 });
          await new Promise(resolve => setTimeout(resolve, 1000)); 
          
          return new Response(JSON.stringify({ success: false, message: `验证码错误！剩余尝试次数: ${5 - attempts} 次` }), { status: 401, headers: corsHeaders });
        }
      } catch (err) {
        return new Response(JSON.stringify({ success: false, message: "校验失败" }), { status: 500, headers: corsHeaders });
      }
    }

    // 路由 4：保护原有的 /api/esims 增删改查接口
    if (path === "/api/esims") {
      // 核心安全逻辑：所有对数据的操作前，必须进行 Token 鉴权
      const reqToken = request.headers.get("Authorization");
      if (!reqToken) {
        return new Response(JSON.stringify({ error: "Unauthorized: Missing Token" }), { status: 401, headers: corsHeaders });
      }
      
      const isValidSession = await env.ESIM_DB.get("session_token_" + reqToken);
      if (!isValidSession) {
        return new Response(JSON.stringify({ error: "Unauthorized: Invalid or Expired Token" }), { status: 401, headers: corsHeaders });
      }

      // ========= 以下为正常的增删改查数据操作流程 =========
      let esims;
      try {
        esims = await env.ESIM_DB.get("esim_list", { type: "json" });
        if (!esims) esims = []; 
      } catch (err) {
        return new Response(JSON.stringify({ error: "KV 未绑定" }), { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // GET 获取列表
      if (request.method === "GET") {
        return new Response(JSON.stringify(esims), { headers: { "Content-Type": "application/json", ...corsHeaders } });
      }

      // POST 新增
      if (request.method === "POST") {
        try {
          const newSim = await request.json();
          if (!newSim.name || !newSim.expireDate) return new Response(JSON.stringify({ success: false, message: "参数错误" }), { status: 400, headers: corsHeaders });
          newSim.id = Date.now().toString(); 
          esims.push(newSim);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      // PUT 更新 (处理全局编辑与部分字段更新)
      if (request.method === "PUT") {
        try {
          const { id, expireDate, name, number, cycle } = await request.json();
          let found = false;
          esims = esims.map(sim => {
            if (sim.id === id) { 
                found = true; 
                if (expireDate !== undefined) sim.expireDate = expireDate;
                if (name !== undefined) sim.name = name;
                if (number !== undefined) sim.number = number;
                if (cycle !== undefined) sim.cycle = cycle;
                return sim; 
            }
            return sim;
          });
          if (!found) return new Response(JSON.stringify({ success: false, message: "未找到记录" }), { status: 404, headers: corsHeaders });
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }

      // DELETE 删除号码
      if (request.method === "DELETE") {
        try {
          const { id } = await request.json();
          esims = esims.filter(sim => sim.id !== id);
          await env.ESIM_DB.put("esim_list", JSON.stringify(esims)); 
          return new Response(JSON.stringify({ success: true }), { headers: corsHeaders });
        } catch (err) { return new Response(JSON.stringify({ success: false }), { status: 400, headers: corsHeaders }); }
      }
    }

    return new Response("404 Not Found", { status: 404 });
  },

  // 定时任务逻辑 (每天检查到期情况并推送提醒)
  async scheduled(event, env, ctx) {
    let tgToken = env.TG_BOT_TOKEN;
    let tgChat = env.TG_CHAT_ID;
    try {
      if (!tgToken) tgToken = await env.ESIM_DB.get("TG_BOT_TOKEN");
      if (!tgChat) tgChat = await env.ESIM_DB.get("TG_CHAT_ID");
    } catch (e) {}

    const esims = await env.ESIM_DB.get("esim_list", { type: "json" });
    if (!esims || esims.length === 0) return; 

    const today = new Date();
    const offset = 8; // 东八区
    const localToday = new Date(today.getTime() + offset * 3600 * 1000);
    localToday.setUTCHours(0, 0, 0, 0);

    let messages = [];

    esims.forEach(sim => {
      const expDate = new Date(sim.expireDate);
      expDate.setUTCHours(0, 0, 0, 0); 
      
      const diffTime = expDate - localToday;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const cycleText = sim.cycle ? `${sim.cycle}天` : '未设置';

      if (diffDays <= 15 && diffDays > 0) {
        messages.push(`⚠️ 【eSIM 保号提醒】\n📱 卡名: ${sim.name}\n📞 号码: ${sim.number || '未填写'}\n🔄 周期: ${cycleText}\n📅 到期: ${sim.expireDate}\n⏳ 剩余: ${diffDays} 天！\n👉 请尽快处理续期！`);
      } else if (diffDays === 0) {
        messages.push(`🚨 【eSIM 紧急提醒】\n📱 卡名: ${sim.name} 今天到期！`);
      } else if (diffDays < 0 && Math.abs(diffDays) % 7 === 0) {
        messages.push(`❌ 【eSIM 停机警告】\n📱 卡名: ${sim.name} 已过期 ${Math.abs(diffDays)} 天。`);
      }
    });

    if (messages.length > 0 && tgToken && tgChat) {
      const text = messages.join("\n\n---\n\n");
      const tgUrl = `https://api.telegram.org/bot${tgToken}/sendMessage`;
      await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          chat_id: tgChat, 
          text: text, 
          parse_mode: "HTML" 
        })
      });
    }
  }
};
