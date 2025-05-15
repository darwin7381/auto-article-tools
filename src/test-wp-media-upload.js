"use strict";
/**
 * WordPress媒體上傳測試腳本
 *
 * 用法:
 * 1. 複製.env.example為.env.local並設置WordPress API憑證
 * 2. 運行 ts-node src/test-wp-media-upload.ts <image_url>
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
// 檢查環境變數是否已設置
if (!WP_API_BASE || !WP_API_USER || !WP_API_PASSWORD) {
    console.error('請設置WordPress API憑證環境變數。');
    console.error('需要設置: NEXT_PUBLIC_WORDPRESS_API_URL, WORDPRESS_API_USER, WORDPRESS_API_PASSWORD');
    process.exit(1);
}
// 從命令行參數獲取圖片URL
var imageUrl = process.argv[2];
if (!imageUrl) {
    console.error('請提供圖片URL作為參數');
    console.error('用法: ts-node src/test-wp-media-upload.ts <image_url>');
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
        var result, error_1;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    console.log('WordPress媒體上傳測試');
                    console.log("API\u57FA\u672CURL: ".concat(WP_API_BASE));
                    console.log("\u7528\u6236\u540D: ".concat(credentials.username));
                    console.log("\u5716\u7247URL: ".concat(imageUrl));
                    _a.label = 1;
                case 1:
                    _a.trys.push([1, 3, , 4]);
                    console.log('開始上傳...');
                    return [4 /*yield*/, (0, wordpressService_1.uploadMediaFromUrl)(credentials, imageUrl)];
                case 2:
                    result = _a.sent();
                    if (result.success) {
                        console.log('\n✅ 上傳成功!');
                        console.log("\u5A92\u9AD4ID: ".concat(result.id));
                        console.log('\n使用此ID作為特色圖片 (featured_media) 的值。');
                    }
                    else {
                        console.error('\n❌ 上傳失敗!');
                        console.error("\u932F\u8AA4: ".concat(result.error));
                    }
                    return [3 /*break*/, 4];
                case 3:
                    error_1 = _a.sent();
                    console.error('\n❌ 上傳過程中發生錯誤:');
                    console.error(error_1);
                    return [3 /*break*/, 4];
                case 4: return [2 /*return*/];
            }
        });
    });
}
// 執行主函數
main().catch(console.error);
