"use strict";
/**
 * WordPress外部圖片URL導入測試腳本
 *
 * 用法:
 * 1. 運行: node src/test-external-image-upload.js <image_url>
 *
 * 這個腳本測試直接從外部URL導入圖片到WordPress媒體庫的功能，
 * 無需先下載圖片再上傳，而是WordPress直接從URL獲取圖片。
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var wordpressService_1 = require("./services/wordpress/wordpressService");
var dotenv = __importStar(require("dotenv"));
// 載入環境變數
dotenv.config({ path: '.env.local' });
// 從環境變數中獲取WordPress API憑證
var WP_API_USER = process.env.WORDPRESS_API_USER || '';
var WP_API_PASSWORD = process.env.WORDPRESS_API_PASSWORD || '';
var WP_API_BASE = process.env.NEXT_PUBLIC_WORDPRESS_API_URL || '';
// 檢查必要參數
var imageUrl = process.argv[2];
if (!imageUrl) {
    console.error('請提供外部圖片URL作為參數');
    console.error('用法: node src/test-external-image-upload.js <image_url>');
    process.exit(1);
}
// 建立WordPress憑證
var credentials = {
    username: WP_API_USER,
    password: WP_API_PASSWORD
};
// 主函數
function main() {
    return __awaiter(this, void 0, void 0, function () {
        var startTime, useAuth, result, endTime, timeSpent, anonymousResult, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('===== WordPress外部圖片URL導入測試 =====');
                    console.log("API\u57FA\u672CURL: ".concat(WP_API_BASE || '未設置(將使用命令行參數)'));
                    console.log("\u7528\u6236\u540D: ".concat(credentials.username || '未設置(將使用命令行參數)'));
                    console.log("\u5716\u7247URL: ".concat(imageUrl));
                    // 確認是否繼續
                    console.log('\n即將測試從外部URL直接導入圖片並獲取媒體ID...');
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 6, , 7]);
                    console.log('\n開始上傳...');
                    startTime = new Date();
                    useAuth = !!(credentials.username && credentials.password);
                    console.log("\u4F7F\u7528\u8A8D\u8B49\u4FE1\u606F: ".concat(useAuth ? '是' : '否'));
                    return [4 /*yield*/, (0, wordpressService_1.uploadMediaFromUrl)(useAuth ? credentials : { username: '', password: '' }, imageUrl)];
                case 2:
                    result = _a.sent();
                    endTime = new Date();
                    timeSpent = (endTime.getTime() - startTime.getTime()) / 1000;
                    if (!result.success) return [3 /*break*/, 3];
                    console.log('\n✅ 上傳成功!');
                    console.log("\u5A92\u9AD4ID: ".concat(result.id));
                    console.log("\u8017\u6642: ".concat(timeSpent.toFixed(2), "\u79D2"));
                    console.log('\n使用此ID作為特色圖片:');
                    console.log("featured_media: ".concat(result.id));
                    return [3 /*break*/, 5];
                case 3:
                    console.error('\n❌ 上傳失敗!');
                    console.error("\u932F\u8AA4: ".concat(result.error));
                    console.error("\u8017\u6642: ".concat(timeSpent.toFixed(2), "\u79D2"));
                    if (!useAuth) return [3 /*break*/, 5];
                    console.log('\n嘗試匿名上傳...');
                    return [4 /*yield*/, (0, wordpressService_1.uploadMediaFromUrl)({ username: '', password: '' }, imageUrl)];
                case 4:
                    anonymousResult = _a.sent();
                    if (anonymousResult.success) {
                        console.log('\n✅ 匿名上傳成功!');
                        console.log("\u5A92\u9AD4ID: ".concat(anonymousResult.id));
                        console.log('\n使用此ID作為特色圖片:');
                        console.log("featured_media: ".concat(anonymousResult.id));
                    }
                    else {
                        console.error('\n❌ 匿名上傳也失敗!');
                        console.error("\u932F\u8AA4: ".concat(anonymousResult.error));
                    }
                    _a.label = 5;
                case 5: return [3 /*break*/, 7];
                case 6:
                    error_1 = _a.sent();
                    console.error('\n❌ 上傳過程中發生錯誤:');
                    console.error(error_1);
                    return [3 /*break*/, 7];
                case 7: return [2 /*return*/];
            }
        });
    });
}
// 執行主函數
main().catch(console.error);
