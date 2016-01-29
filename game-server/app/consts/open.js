module.exports = {
    CALLBACK_URL: {
      APIX:  
    },
    JUHE: {
        SMS_API: {
            APP_KEY: '6fd1a531de0fa3f6a4b17d1f98115142',
            URL: 'http://v.juhe.cn/sms/send',
            METHOD: 'GET',
            CONTENT_TYPE: 'JSON',
            TEMPLATE_ID: {
                MOBILE_BINDING: 9903
            }
        }
    },
    APIX: {
        MOBILE_RECHARGE: {
            KEY: '923d6ac17e804d8374e3c4e7efdf105f',
            URL: 'http://p.apix.cn/apixlife/pay/phone/phone_recharge'
            
        }
    }
}