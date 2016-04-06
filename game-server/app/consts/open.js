module.exports = {
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
            URL: 'http://p.apix.cn/apixlife/pay/phone/phone_recharge',
            METHOD: 'GET',
            CALLBACK_URL: ''
        }
    },
    APPLE_IAP: {
        VERIFY_RECEIPT: {
            SANDBOX: 'https://sandbox.itunes.apple.com/verifyReceipt',
            PRODUCTION: 'https://buy.itunes.apple.com/verifyReceipt',
            METHOD: 'POST',
            OK_STATUS: 0,
            USE_SANDBOX_IN_PRODUCTION: 21007
        }
    },
    PAYMENT: {
        PINGPP: {
            "testSecretKey": "sk_test_XTGyXLL0qPu1bXHKyHnzrTOS",
            "testPublishableKey": "pk_test_KOKWjLHij10CrvLC8CmTenzT",
            "liveSecretKey": "sk_live_GCWjr1WLWTa5nXzTO89SWLSG",
            "livePublishableKey": "pk_test_KOKWjLHij10CrvLC8CmTenzT",
            "appid": "app_jrLOqTOyTmb9fv5m",
            "currency": "cny",
            "channel": ["alipay", "alipay_wap", "alipay_qr", "alipay_pc_direct", "apple_pay", "upacp", "upacp_wap", "upacp_pc", "cp_b2b", "wx"]
        }
     }
}