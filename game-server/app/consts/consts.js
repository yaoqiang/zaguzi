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
        }
    },
    MESSAGE: {
        RES: 200,
        ERR: 500,
        PUSH: 600
    },
    Event:{
        chat: 'onChat',
        join: 'onJoin',
        ready: 'onReady',
        leave: 'onLeave',
        talk: 'onTalk',
        action: 'onAction'
    },

    GAME: {
        TYPE: {
            FIVE: 1,
            SIX: 2,
            SEVEN: 3
        },
        IDENTITY: {
            GUZI: 1,
            HONG3: 2
        }

    }
}