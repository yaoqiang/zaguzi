module.exports = {
    GLOBAL: {
        GOLD_INIT: 5000,
        ADD_GOLD_TYPE: {
            RECHARGE: 1,
            BATTLE: 2,
            TASK: 3,
            ACTIVITY: 4,
            MATCH: 5,
            GRANT: 6
        },
        ADD_ITEM_TYPE: {
            RECHARGE: 1,
            BATTLE: 2,
            TASK: 3,
            ACTIVITY: 4,
            MATCH: 5,
            GRANT: 6
        },
        ITEM_MODE: {
            TERM: 'term',
            COUNT: 'count'
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
            ERR: 3009   //未知错误
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
            ERR: 5004
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
        CHECK_IN: {
            ALREADY_CHECK_IN: 8001,
            ERR: 8002
        },
        BANKRUPTCY_GRANT: {
            ALREADY_GRANT: 9001,
            MORE_MONEY: 9002,
            ERR: 9003
        }
    },
    ERR_MESSAGE: {
        1001: "您已在游戏中, 无法加入",   //在其他牌桌
        1002: "您的金币不足, 无法加入",
        1003: "您的金币太多了, 请前往高倍区",
        1004: "系统错误, 请联系管理员",    //参数错误等

        2001: "您没有在牌桌中, 请重新加入",
        2002: "您已准备",
        2003: "系统错误, 请联系管理员",

        3001: "您没有红3, 不能进行亮3操作", //没3 亮3（非法操作）
        3002: "您有红3, 不能叫股子",   //有3 扎股子,
        3003: "您不在游戏中, 不能说话",
        3004: "参数错误",
        3005: "叫股子时, 附加牌不是黑3",
        3006: "叫股子时, 附加黑3不在手牌里",
        3007: "亮3时, 附加牌不是3",
        3008: "亮3时, 附加3不在手牌里",    //参数错误等
        3009: "系统错误, 请联系管理员",    //参数错误等

        4001: "您已成功离开牌桌",
        4002: "游戏中, 无法离开",
        4003: "系统错误, 请联系管理员",    //参数错误等

        5001: "没有该手牌, 请检查",
        5002: "不能大过上手牌, 请检查",
        5003: "必须出所有5",
        5004: "系统错误, 请联系管理员",    //参数错误等

        6001: "系统错误, 请联系管理员",    //参数错误等

        7001: "您没有在牌桌中, 无法托管",
        7002: "您已托管成功",
        7003: "您不在托管状态",
        7004: "游戏还未开始, 无法托管",
        7005: "系统错误, 请联系管理员",    //参数错误等

        8001: "",
        8002: "",
        9001: "",
        9002: ""
    },
    MESSAGE: {
        RES: 200,
        ERR: 500,
        PUSH: 600
    },
    EVENT: {
        CHAT: 'onChat',
        BROADCAST: 'onBroadcast',
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
        BACK_TO_GAME: 'onBackToGame'

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
            NOT_READY: 30,
            TALK: 15,
            FAN: 15
        },
        PHASE: {
            STARTING: 0,
            TALKING: 1,
            FAN: 2,
            OVER: 3
        },
        TRUSTEESHIP: {
            TIMEOUT_TIMES: 3
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
        }


    },

    LOG: {
        SYSTEM: 'system',
        GAME: 'game',
        USER: 'user',
        GOLD: 'gold',
        BALANCE: 'balance'
    }
}
