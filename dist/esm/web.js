var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import { registerWebPlugin, WebPlugin } from '@capacitor/core';
import { CardBrand, } from './definitions';
function flatten(json, prefix, omit) {
    let obj = {};
    for (const prop of Object.keys(json)) {
        if (typeof json[prop] !== 'undefined' && json[prop] !== null && (!Array.isArray(omit) || !omit.includes(prop))) {
            if (typeof json[prop] === 'object') {
                obj = Object.assign(Object.assign({}, obj), flatten(json[prop], prefix ? `${prefix}[${prop}]` : prop));
            }
            else {
                const key = prefix ? `${prefix}[${prop}]` : prop;
                obj[key] = json[prop];
            }
        }
    }
    return obj;
}
function stringify(json) {
    let str = '';
    json = flatten(json);
    for (const prop of Object.keys(json)) {
        const key = encodeURIComponent(prop);
        const val = encodeURIComponent(json[prop]);
        str += `${key}=${val}&`;
    }
    return str;
}
function formBody(json, prefix, omit) {
    json = flatten(json, prefix, omit);
    return stringify(json);
}
function _callStripeAPI(fetchUrl, fetchOpts) {
    return __awaiter(this, void 0, void 0, function* () {
        const res = yield fetch(fetchUrl, fetchOpts);
        let parsed;
        try {
            parsed = yield res.json();
        }
        catch (e) {
            parsed = yield res.text();
        }
        if (res.ok) {
            return parsed;
        }
        else {
            throw parsed && parsed.error && parsed.error.message ? parsed.error.message : parsed;
        }
    });
}
function _stripePost(path, body, key, extraHeaders) {
    return __awaiter(this, void 0, void 0, function* () {
        extraHeaders = extraHeaders || {};
        return _callStripeAPI(`https://api.stripe.com${path}`, {
            body: body,
            method: 'POST',
            headers: Object.assign({ 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json', 'Authorization': `Bearer ${key}`, 'Stripe-version': '2020-03-02' }, extraHeaders),
        });
    });
}
function _stripeGet(path, key, extraHeaders) {
    return __awaiter(this, void 0, void 0, function* () {
        extraHeaders = extraHeaders || {};
        return _callStripeAPI(`https://api.stripe.com${path}`, {
            method: 'GET',
            headers: Object.assign({ 'Accept': 'application/json', 'Authorization': `Bearer ${key}`, 'Stripe-version': '2020-03-02' }, extraHeaders),
        });
    });
}
export class StripePluginWeb extends WebPlugin {
    constructor() {
        super({
            name: 'Stripe',
            platforms: ['web'],
        });
    }
    setPublishableKey(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof opts.key !== 'string' || opts.key.trim().length === 0) {
                throw new Error('you must provide a valid key');
            }
            const scriptEl = document.createElement('script');
            scriptEl.src = 'https://js.stripe.com/v3/';
            document.body.appendChild(scriptEl);
            this.publishableKey = opts.key;
            return new Promise((resolve, reject) => {
                scriptEl.addEventListener('error', (ev) => {
                    document.body.removeChild(scriptEl);
                    reject('Failed to load Stripe JS: ' + ev.message);
                }, { once: true });
                scriptEl.addEventListener('load', () => {
                    try {
                        this.stripe = new window.Stripe(opts.key);
                        resolve();
                    }
                    catch (err) {
                        document.body.removeChild(scriptEl);
                        reject(err);
                    }
                }, { once: true });
            });
        });
    }
    createCardToken(card) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = formBody(card, 'card', ['phone', 'email']);
            return _stripePost('/v1/tokens', body, this.publishableKey);
        });
    }
    createBankAccountToken(bankAccount) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = formBody(bankAccount, 'bank_account');
            return _stripePost('/v1/tokens', body, this.publishableKey);
        });
    }
    confirmPaymentIntent(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (opts.applePayOptions) {
                throw 'Apple Pay is not supported on web';
            }
            if (opts.googlePayOptions) {
                throw 'Google Pay is not supported on web';
            }
            if (!opts.clientSecret) {
                return Promise.reject('you must provide a client secret');
            }
            let confirmOpts;
            if (opts.paymentMethodId) {
                confirmOpts = {
                    payment_method: opts.paymentMethodId,
                };
            }
            else if (opts.card) {
                const token = yield this.createCardToken(opts.card);
                confirmOpts = {
                    save_payment_method: opts.saveMethod,
                    setup_future_usage: opts.setupFutureUsage,
                    payment_method: {
                        billing_details: {
                            email: opts.card.email,
                            name: opts.card.name,
                            phone: opts.card.phone,
                            address: {
                                line1: opts.card.address_line1,
                                line2: opts.card.address_line2,
                                city: opts.card.address_city,
                                state: opts.card.address_state,
                                country: opts.card.address_country,
                                postal_code: opts.card.address_zip
                            }
                        },
                        card: {
                            token: token.id,
                        },
                    },
                };
            }
            return this.stripe.confirmCardPayment(opts.clientSecret, confirmOpts).then(response => (response.paymentIntent || {}));
        });
    }
    confirmSetupIntent(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!opts.clientSecret) {
                return Promise.reject('you must provide a client secret');
            }
            return Promise.reject('Not supported on web');
        });
    }
    payWithApplePay(options) {
        return __awaiter(this, void 0, void 0, function* () {
            throw 'Apple Pay is not supported on web';
        });
    }
    cancelApplePay() {
        return __awaiter(this, void 0, void 0, function* () {
            throw 'Apple Pay is not supported on web';
        });
    }
    finalizeApplePayTransaction(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            throw 'Apple Pay is not supported on web';
        });
    }
    payWithGooglePay(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            throw 'Google Pay is not supported on web';
        });
    }
    createSourceToken(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            throw 'Not implemented';
        });
    }
    createPiiToken(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            const body = formBody({ id_number: opts.pii }, 'pii');
            return _stripePost('/v1/tokens', body, this.publishableKey);
        });
    }
    createAccountToken(account) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!account.legalEntity) {
                return Promise.reject('you must provide a legal entity');
            }
            let body = {};
            if (account.legalEntity.type === 'individual') {
                body.business_type = 'individual';
                body.individual = account.legalEntity;
                body.tos_shown_and_accepted = account.tosShownAndAccepted;
            }
            else {
                body.business_type = 'company';
                body.company = account.legalEntity;
            }
            delete account.legalEntity.type;
            return _stripePost('/v1/tokens', formBody({ account: body }), this.publishableKey);
        });
    }
    customizePaymentAuthUI(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    presentPaymentOptions() {
        return __awaiter(this, void 0, void 0, function* () {
            return;
        });
    }
    isApplePayAvailable() {
        return __awaiter(this, void 0, void 0, function* () {
            return { available: false };
        });
    }
    isGooglePayAvailable() {
        return __awaiter(this, void 0, void 0, function* () {
            return { available: false };
        });
    }
    validateCardNumber(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                valid: opts.number.length > 0,
            };
        });
    }
    validateExpiryDate(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            let { exp_month, exp_year } = opts;
            if (exp_month < 1 || exp_month > 12) {
                return {
                    valid: false,
                };
            }
            if (String(exp_year).length === 2) {
                exp_year = parseInt('20' + String(exp_year));
            }
            const currentYear = new Date().getFullYear();
            if (exp_year > currentYear) {
                return {
                    valid: true,
                };
            }
            else if (exp_year === currentYear && exp_month >= (new Date().getMonth() + 1)) {
                return {
                    valid: true,
                };
            }
            else {
                return {
                    valid: false,
                };
            }
        });
    }
    validateCVC(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            if (typeof opts.cvc !== 'string') {
                return { valid: false };
            }
            const len = opts.cvc.trim().length;
            return {
                valid: len > 0 && len < 4,
            };
        });
    }
    identifyCardBrand(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            return {
                brand: CardBrand.UNKNOWN,
            };
        });
    }
    addCustomerSource(opts) {
        return this.cs.addSrc(opts.sourceId);
    }
    customerPaymentMethods() {
        return this.cs.listPm();
    }
    deleteCustomerSource(opts) {
        return undefined;
    }
    initCustomerSession(opts) {
        return __awaiter(this, void 0, void 0, function* () {
            this.cs = new CustomerSession(opts);
        });
    }
    setCustomerDefaultSource(opts) {
        return this.cs.setDefaultSrc(opts.sourceId);
    }
}
class CustomerSession {
    constructor(key) {
        this.key = key;
        if (!key.secret || !Array.isArray(key.associated_objects) || !key.associated_objects.length || !key.associated_objects[0].id) {
            throw new Error('you must provide a valid configuration');
        }
        this.customerId = key.associated_objects[0].id;
    }
    listPm() {
        return __awaiter(this, void 0, void 0, function* () {
            const res = yield _stripeGet(`/v1/customers/${this.customerId}`, this.key.secret);
            return {
                paymentMethods: res.sources.data,
            };
        });
    }
    addSrc(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield _stripePost('/v1/customers/' + this.customerId, formBody({
                source: id,
            }), this.key.secret);
            return this.listPm();
        });
    }
    setDefaultSrc(id) {
        return __awaiter(this, void 0, void 0, function* () {
            yield _stripePost('/v1/customers/' + this.customerId, formBody({
                default_source: id,
            }), this.key.secret);
            return yield this.listPm();
        });
    }
}
const StripePluginInstance = new StripePluginWeb();
export { StripePluginInstance };
registerWebPlugin(StripePluginInstance);
//# sourceMappingURL=web.js.map