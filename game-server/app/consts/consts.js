module.exports = {
    GLOBAL: {
        GOLD_INIT: 5000
    },
    ROOM: {
        JOIN_RET_CODE: {
            OK: 1,
            IN_OTHER_GAME: 2,
            ERR: 3
        },
        READY_RET_CODE: {
            OK: 1,
            ERR: 2
        },
        TALK_RET_CODE: {
            OK: 1,
            ERR: 2
        },
        LEAVE_RET_CODE: {
            OK: 1,
            ERR: 2
        },
        FAN_RET_CODE: {
            OK: 1,
            ERR: 2
        }
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
        TALK_COUNTDOWN: 'onTallCountdown',
        TALK_COUNTDOWN_TIMEOUT: 'onTallCountdownTimeout',
        TALK: 'onTalk',
        FAN: 'onFan',
        OVER: 'onOver'

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
        TIMER: {
            TALK: 10,
            FAN: 15
        }

    },

    LOG: {
        GAME: 'game.log',
        USER: 'user.log',
        GOLD: 'gold.log'
    }
}