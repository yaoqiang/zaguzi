module.exports = {
    GLOBAL: {
        //0：普通场，1：元宝场，2：比赛场，3：私人场，4：特殊场(亮王?等)
        LOBBY: [0, 1, 2, 3, 4],
        GENDER: {
            MALE: 'MALE',
            FEMALE: 'FEMALE'
        },
        GOLD_INIT: 5000,
        JOIN_MIN_GOLD: 1000,
        
        ADD_GOLD_TYPE: {
            RECHARGE: 'RECHARGE',
            BATTLE: 'BATTLE',
            TASK: 'TASK',
            ACTIVITY: 'ACTIVITY',
            INVITE: 'INVITE',
            MATCH: 'MATCH',
            GRANT: 'GRANT',
            RECHARGE_ROLLBACK: 'RECHARGE_ROLLBACK',
            EXCHANGE: 'EXCHANGE'
        },
        ADD_ITEM_TYPE: {
            RECHARGE: 'RECHARGE',
            BATTLE: 'BATTLE',
            TASK: 'TASK',
            ACTIVITY: 'ACTIVITY',
            INVITE: 'INVITE',
            MATCH: 'MATCH',
            GRANT: 'GRANT',
            RECHARGE_ROLLBACK: 'RECHARGE_ROLLBACK',
            CONSUME: 'CONSUME',
            EXCHANGE: 'EXCHANGE'
        },
        ADD_FRAGMENT_TYPE: {
            TASK: 'TASK',
            ACTIVITY: 'ACTIVITY',
            EXCHANGE: 'EXCHANGE',
            EXCHANGE_FAILED_RETURN: 'EXCHANGE_FAILED_RETURN'
        },
        ITEM_MODE: {
            TERM: 'term',
            COUNT: 'count'
        },
        
        KICK_REASON: {
            ANOTHER_LOGIN: 'ANOTHER_LOGIN',
            SERVICE_MAINTENANCE: 'SERVICE_MAINTENANCE',
            UNKNOWN: 'UNKNOWN'
        }
    },
    ERR_CODE: {
        SYS: {
            PARAMETER_ERR: 1,
            SYS_ERR: 2
        },
        JOIN: {
            IN_GAME: 1001,   //在其他牌桌
            TOO_POOR: 1002,
            TOO_RICH: 1003,
            ERR: 1004    //参数错误等
        },
        READY: {
            NOT_INT_GAME: 2001,
            ALREADY_READY: 2002,
            ERR: 2003
        },
        TALK: {
            LIANG3_WITHOUT3: 3001, //没3 亮3（非法操作）
            GUZI_WITH3: 3002,   //有3 扎股子,
            NOT_IN_GAME: 3003,
            PARAMETER_ERR: 3004,    //参数错误
            GUZI_APPEND_NOT_3: 3005,    //股子附加牌不是3
            GUZI_APPEND_NOT_HOLDING_CARD: 3006, //股子附加3，但是手牌里没有
            LIANG3_APPEND_NOT_3: 3007,  //亮3附加牌不是3
            LIANG3_APPEND_NOT_HOLDING_CARD: 3008,   //亮3附加3，但是手牌里没有
            ERR: 3009,   //未知错误,
            ALREADY_TALK: 3010, //已说话
            NOT_YOU: 3011   //不轮他说
        },
        LEAVE: {
            NOT_IN_GAME: 4001,
            GAMING: 4002,
            ERR: 4003
        },
        FAN: {
            WITHOUT_CARDS: 5001,
            NOT_BIGGER: 5002,
            MUST_BE_FIVE: 5003,
            MUST_FAN: 5004,
            FAN_REPEAT: 5005,
            ERR: 5006,
            MUST_CONTAINS_HEART5: 5007
        },
        SETTLE: {
            ERR: 6001
        },
        TRUSTEESHIP: {
            NOT_IN_GAME: 7001,
            ALREADY_TRUSTEESHIP: 7002,
            ALREADY_CANCELED_TRUSTEESHIP: 7003,
            NOT_GAMING: 7004,
            ERR: 7005
        },
        CHAT: {
            NOT_MORE_TRUMPET: 7101,
            NOT_INT_GAME: 7102,
            ERR: 7103
        },
        CHECK_IN: {
            ALREADY_CHECK_IN: 8001,
            ERR: 8002
        },
        BANKRUPTCY_GRANT: {
            ALREADY_GRANT: 9001,
            MORE_MONEY: 9002,
            ERR: 9003
        },
        TASK_GRANT: {
            ALREADY_GRANT: 9101,
            ERR: 9102
        },
        EXCHANGE: {
            YUANBAO_NOT_ENOUGH: 9201,
            INVENTORY_NOT_ENOUGH: 9202,
            ITEM_OFFLINE: 9203,
            NOT_BLANK_MOBILE: 9204,
            NOT_BLANK_CONTACT: 9205,
            NOT_BLANK_ADDRESS: 9206,
            INVALID_MOBILE: 9207,
            ERR: 9208,
            NEED_CUSTOMER: 9209,
            APIX_INVALID: 9210
        },
        SMS: {
            MOBILE_NOT_BLANK: 9301,
            MOBILE_NOT_VALIDATE: 9302,
            MOBILE_ALREADY_BINDING: 9303,
            CAPTCHA_ERR: 9304,
            ERR: 9305,
            MOBILE_NOT_FOUNT: 9306,
            INVITE_MOBILE_NOT_FOUNT: 9307,
            INVITE_MOBILE_CAN_NOT_BE_SELF: 9308
        },
        PRIVATE_GAME: {
            CREATE_NOT_BLANK: 9401,
            JOIN_PASSWORD_NOT_CORRECT: 9402,
            JOIN_GAME_NOT_EXIST: 9403,
            INVITE_BY_MOBILE_NOT_ONLINE: 9404,
            ERR: 9405,
            JOIN_GAME_IS_FULL: 9406,
        },
        LOTTERY: {
            TOO_POOR: 9501,
            RANK_TOO_LOW: 9502
        }
    },
    //以下错误信息 客户端使用, 服务端只返回Code.
    ERR_MESSAGE: {
        1001: "您已在游戏中, 无法加入",   //在其他牌桌
        1002: "您的金币不足, 请前往商城购买",
        1003: "您的金币太多了, 请前往高倍区",
        1004: "加入失败",    //参数错误等

        2001: "您没有在牌桌中, 请重新加入",
        2002: "您已准备",
        2003: "准备失败",

        3001: "您没有红3, 不能进行亮3操作", //没3 亮3（非法操作）
        3002: "您有红3, 不能叫股子",   //有3 扎股子,
        3003: "您不在游戏中, 不能说话",
        3004: "参数错误",
        3005: "叫股子时, 附加牌不是黑3",
        3006: "叫股子时, 附加黑3不在手牌里",
        3007: "亮3时, 附加牌不是3",
        3008: "亮3时, 附加3不在手牌里",    //参数错误等
        3009: "说话失败",    //参数错误等
        3010: "您已说过话了",    //参数错误等
        3011: "当前不轮您说话",    //参数错误等

        4001: "您已成功离开牌桌",
        4002: "游戏中, 无法离开",
        4003: "离开游戏失败",    //参数错误等

        5001: "没有该手牌, 请检查",
        5002: "不能大过上手牌, 请检查",
        5003: "必须出所有5",
        5004: "您是当前回合老大,不能不出",
        5005: "当前回合您已出牌,不要连击出牌",
        5006: "出牌失败",    //参数错误等
        5007: "首轮必须包含红桃5",

        6001: "系统错误, 请联系管理员",    //参数错误等

        7001: "您没有在牌桌中, 无法托管",
        7002: "您已托管成功",
        7003: "您不在托管状态",
        7004: "游戏还未开始, 无法托管",
        7005: "托管失败",    //参数错误等
        
        7101: "您的喇叭不够",
        7102: "发送聊天失败, 玩家不在线或不在游戏",
        7103: "发送失败",

        8001: "玩家已签到",
        8002: "签到失败",

        9001: "已领取今日补助",
        9002: "金币超出领取最低限制",
        9003: "领取补助失败",

        9101: "已领取任务奖励",
        9102: "领取任务奖励失败",

        9201: "元宝不足",
        9202: "库存不足",
        9203: "兑换物品已下线",
        9204: "请填写手机号码",
        9205: "请填写联系人",
        9206: "请填写收件地址",
        9207: "手机号码无效",
        9208: "兑换失败",
        9209: "兑换失败, 请联系客服",
        9210: "运营商接口当前不可用, 请稍后重试",

        9301: "请输入手机号",
        9302: "手机号格式有误",
        9303: "该手机已绑定",
        9304: "验证码错误",
        9305: "操作失败",
        9306: "您输入的手机号没有绑定游戏帐号",
        9307: "您输入的手机号没有绑定游戏帐号",
        9308: "不支持填写自己的手机号",

        9401: "请填写房间信息",
        9402: "房间密码输入错误",
        9403: "房间不存在,请刷新列表",
        9404: "玩家不在线",
        9405: "操作失败",
        9406: "房间已满员,请刷新列表",

        9501: "您的金币不足, 无法抽奖",
        9502: "您的级别太低, 不能抽奖"

    },
    MESSAGE: {
        RES: 200,
        ERR: 500,
        PUSH: 600
    },
    EVENT: {
        CHAT: 'onChat',
        BROADCAST: 'onBroadcast',
        BBS: 'onBBS',
        CHAT_PRIVATE: 'onChatPrivate',
        JOIN: 'onJoin',
        READY: 'onReady',
        LEAVE: 'onLeave',
        START: 'onStart',
        TALK_COUNTDOWN: 'onTalkCountdown',
        TALK_COUNTDOWN_TIMEOUT: 'onTalkCountdownTimeout',
        TALK: 'onTalk',
        AFTER_TALK: 'onAfterTalk',
        FAN_COUNTDOWN: 'onFanCountdown',
        FAN_COUNTDOWN_TIMEOUT: 'onFanCountdownTimeout',
        FAN: 'onFan',
        TRUSTEESHIP: 'onTrusteeship',
        CANCEL_TRUSTEESHIP: 'onCancelTrusteeship',
        OVER: 'onOver',
        GOLD_CHANGE: 'onGoldChange',
        FAN_WHEN_IS_RED: 'onFanWhenIsRed',
        FAN_FINISHED: 'onFanFinished',
        BACK_TO_GAME: 'onBackToGame',
        UI_COMMAND: 'onUICommand',
        VERSION_UPGRADE: 'onVersionUpgrade',
        INGOT_CHANGE: 'onIngotChange',
        RESTART_GAME: 'onRestartGame',
        DISSOLVE_GAME: 'onDissolveGame',
        PAYMENT_RESULT: 'onPaymentResult',
        UI_HIGHLIGHT_PROFILE: 'UI_HIGHLIGHT_PROFILE',
        
        //UI交互事件
        UI_ON_ENTRY_WRAPPER: 'UI_ON_ENTRY_WRAPPER',    //进入大厅后的高亮wrapper
        
        UI_HIGHLIGHT_DAILY_TODO: 'UI_HIGHLIGHT_DAILY_TODO', //高亮每日必做
        UI_HIGHLIGHT_SYSTEM_MAIL: 'UI_HIGHLIGHT_SYSTEM_MAIL',   //高亮系统邮件
        UI_HIGHLIGHT_SETTING: 'UI_HIGHLIGHT_SETTING',   //高亮系统设置
        UI_UI_HIGHLIGHT_SHOP: 'UI_UI_HIGHLIGHT_SHOP',   //高亮商城
        UI_HIGHLIGHT_RANKING_LIST: 'UI_HIGHLIGHT_RANKING_LIST', //高亮排行榜
        UI_HIGHLIGHT_TASK: 'UI_HIGHLIGHT_TASK', //高亮任务
        UI_HIGHLIGHT_EXCHANGE: 'UI_HIGHLIGHT_EXCHANGE', //高亮兑换
        UI_HIGHLIGHT_ACTIVITY: 'UI_HIGHLIGHT_ACTIVITY', //高亮活动
        UI_ALERT_DAILY_TODO: 'UI_ALERT_DAILY_TODO', //弹出每日必做
        UI_ALERT_BANKRUPTCY_IN_GAME: 'UI_ALERT_BANKRUPTCY_IN_GAME', //弹出牌局中领取破产补助框
        UI_ALERT_QUICK_RECHARGE: 'UI_ALERT_QUICK_RECHARGE', //弹出快捷充值框
    },

    CHAT_SCOPE: {
      ALL: 'ALL',
      PRIVATE: 'PRIVATE',
      GAME: 'GAME',
      BBS: 'BBS'
    },
    CHAT_IN_GAME_TYPE: {
        QUICK: 1,
        EXPRESSION: 2,
        CUSTOM: 3
    },
    
    UI_COMMAND: {
        ALERT: 'onAlert',
        PROMPT: 'onPrompt',
        BLINK: {
            GRANT: 'onGrantBlink',
            SETTING: 'onSettingBlink',
            TASK: 'onTaskBlink'
        }
    },

    GAME: {
        TYPE: {
            FIVE: 5,
            SIX: 6,
            SEVEN: 7
        },
        IDENTITY: {
            UNKNOW: 0,
            GUZI: 1,
            HONG3: 2
        },
        ACTUAL_IDENTITY: {
            GUZI: 0,
            Heart3: 1,
            Diamond3: 2,
            Spade3: 3
        },
        TIMER: {
            NOT_READY: 15,
            TALK: 10,
            FAN: 15,
            NOT_READY_PRIVATE: 120,
            TRUSTEESHIP: 1  //托管出牌时间
        },
        PHASE: {
            STARTING: 0,
            TALKING: 1,
            FAN: 2,
            OVER: 3
        },
        TRUSTEESHIP: {
            TIMEOUT_TIMES: 1    //超时出牌N次后自动托管
        },
        RESULT: {
            RED_WIN: 'RED_WIN',
            BLACK_WIN: 'BLACK_WIN',
            TIE: 'TIE'
        },
        ACTOR_RESULT: {
            WIN: 'WIN',
            LOSE: 'LOSE',
            TIE: 'TIE'
        },
        DISSOLVE_NOBODY_TALK_TIME: 2,   //N局没人说话, 自动解散牌局
        PRIVATE_GAME_NUMBER_START: 90000,   //私人房间编号起始值
        PRIVATE_GAME_BASE_MIN: 100,   //私人房间底注选择

    },

    EXCHANGE: {
        TYPE: {
            VIRTUAL: "VIRTUAL", //虚拟物品
            INBOX_CALL: "INBOX_CALL", //话费类
            INBOX_DATA_MOBILE: "INBOX_DATA_MOBILE", //流量类, 移动
            INBOX_DATA_UNICOM: "INBOX_DATA_UNICOM", //流量类, 联通
            INBOX_DATA_TELECOM: "INBOX_DATA_TELECOM", //流量类, 电信
            OUTBOX: "OUTBOX"    //实体类
        }
    },

    ORDER: {
        STATE: {
            SUBMIT: "SUBMIT",
            PENDING: "PENDING",
            PAYMENT: "PAYMENT",
            PAYMENT_FAILED: "PAYMENT_FAILED",
            CANCELED: "CANCELED",
            FINISHED: "FINISHED",
            REFUND_PENDING: "REFUND_PENDING",
            REFUND_SUCCESS: "REFUND_SUCCESS",
            REFUND_FAILED: "REFUND_FAILED"
        }
    },
    
    INVITE: {
        STATE: {
            FINISHED: "FINISHED",
            ERR: 'ERR'
        }  
    },

    RANKING_LIST: {
        RICH: 'RICH',
        GOD: 'GOD',
        RECHARGE: 'RECHARGE',
        MEETING: 'MEETING',
        GOD_MONTH: 'GOD_MONTH'
    },

    // LOG: {
    //     SYSTEM: 'system',
    //     GAME: 'game',
    //     USER: 'user',
    //     BALANCE: 'balance',
    //     PAYMENT: 'payment',
    //     SYNC: 'sync',
    //     NORMAL: 'normal',
    //     OPEN_API: 'open_api'
    // }
    
    LOG: {
        //日志文件名称定义
        SYSTEM: 'game-system',
        GAME: 'game-all',
        GAME_RECORD: 'game-record',
        ONLINE_RECORD: 'online-record',
        USER: 'game-all',
        BALANCE: 'game-all',
        SYNC: 'game-all',
        NORMAL: 'game-all',
        PAYMENT: 'payment',
        OPEN_API: 'open-api',
        LOGIN_RECORD: 'login-record',
        GAME_HTTP: 'game-http',
        ERROR: 'error-all',
        
        //日志具体结果定义, 后来改造后, 貌似只有USER会用到, 其他单独走各自的log结构.
        CONF: {
            RECORD: {
                TYPE: 'RECORD',
                ACTION: {
                    LOGIN: 'LOGIN',
                    GAME: 'GAME',
                    ONLINE: 'ONLINE'
                }
            },
            GAME: {
                TYPE: 'GAME',
                ACTION: {
                    START: 'START'
                }
            },
            USER: {
                TYPE: 'USER',
                ACTION: {
                    CREATE_PLAYER: 'CREATE_PLAYER',
                    ADD_GOLD: 'ADD_GOLD',
                    ADD_FRAGMENT: 'ADD_FRAGMENT',
                    ADD_ITEM: 'ADD_ITEM',
                    EXCHANGE: 'EXCHANGE',
                    UPDATE_PROFILE: 'UPDATE_PROFILE'
                }
            },
            PAYMENT: {
                TYPE: 'PAYMENT',
                ACTION: {
                    REQUEST_CHARGE: 'REQUEST_CHARGE',
                    PAID_OPTION: 'PAID_OPTION'
                }
            },
            OPEN_API: {
                TYPE: 'OPEN_API',
                ACTION: {
                    SEND_SMS: 'SEND_SMS',
                    RECHARGE_MOBILE_FEE: 'RECHARGE_MOBILE_FEE',
                    APIX_CALLBACK: 'APIX_CALLBACK'
                }
            }
            
        }
    },

    DEFAULT_IP: '127.0.0.1'
}

