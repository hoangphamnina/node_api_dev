const express = require('express');
const fs = require('fs');
const multer = require("multer");
const path = require('path');

const {
    GoogleGenerativeAI,
    HarmCategory,
    HarmBlockThreshold,
} = require("@google/generative-ai");
async function CreateContent(req, res) {
    const { apikey } = req.headers;
    const { length, keyword, tone, note, outline, title, langs } = req.body;

    if (apikey == '' || typeof apikey == 'undefined') {
        // writeError('key error 2');
        res.status(500).send("Key không hợp lệ");
        return;
    }

    let lang_txt = [];
    for (const key in langs) {
        if (Object.prototype.hasOwnProperty.call(langs, key)) {
            const e = langs[key];
            if (key == 'vi') continue;
            lang_txt.push(`\"content${key}\": string (markdown) - Nội dung bài viết dưới dạng ${e}`);
        }
    }

    try {
        const genAI = new GoogleGenerativeAI(apikey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const Prompt = `
            *${note}. Bạn là một nhà sáng tao nội dung. Dựa vào dàn ý theo file JSON: \`\`\`json\n\n ${outline} \n\n\`\`\` và viết giúp tôi một bài viết SEO thõa mãn tất cả các tiêu chí sau:
            1. Phong cách viết: ${tone}
            2. Từ khóa mục tiêu: **${keyword}**
            3. Giữ nguyên nội dung và thứ tự các tiêu đề H2, H3 theo dàn ý
            4. Nội dung dài: ${length}
            5. Tiêu đề bài viết: ${title}
            6. Mật độ từ khóa mục tiêu: **1% - 1.5%**
            7. Bỏ tiêu đề "Kết luận", "Lời kết", "Mở đầu", "Tóm lại", "Tổng kết",...
            8. Chuyển đổi phần nội dung của content sang dạng json encode để chắc chắn không bị lỗi khi parse json
            9. Không sử dụng nháy đôi (double quotes) trong nội dung json
            Sau khi hoàn thành, cung cấp cho bài viết:
            * SEO Description (160-300 ký tự)
            * SEO Title (40-70 ký tự)
            * Slug SEO Title
            *Lưu ý: Không cần trả lời gì khác và chỉ hiển thị markdown theo cấu trúc json như bên dưới.
            \`\`\`json
            {
                \"title\": string - Seo title,
                \"description\": string - Seo description,
                \"content\": string (markdown) - Nội dung bài viết,
                ${lang_txt.join(',\n')}
            }
            \`\`\`
        `;

        console.log(Prompt);

        const result = await model.generateContent(Prompt);
        console.log(result);

        res.setHeader('Content-Type', 'application/json');
        const data = {
            content: result.response.text(),
            promptTokenCount: result.response.usageMetadata.promptTokenCount,
            candidatesTokenCount: result.response.usageMetadata.candidatesTokenCount,
            totalTokenCount: result.response.usageMetadata.totalTokenCount
        };
        res.write(JSON.stringify(data));

        // const response = await model.generateContentStream(Prompt);
        // res.setHeader('Content-Type', 'text/stream');
        // for await (const chunk of response.stream) {
        //     const data = {
        //         content: chunk.text(),
        //         promptTokenCount: chunk.usageMetadata.promptTokenCount,
        //         candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount,
        //         totalTokenCount: chunk.usageMetadata.totalTokenCount
        //     };
        //     res.write(JSON.stringify(data));
        // }
        // writeLog();
        res.end();
    } catch (error) {
        // writeError(error);
        // console.log(apikey);
        console.log(error);
        res.status(error.status).send(error.statusText);
    }
}
async function CreateOutline(req, res) {
    const { apikey } = req.headers;
    const { length, keyword, title, tone } = req.body;

    if (apikey == '' || typeof apikey == 'undefined') {
        // writeError('key error 1');
        res.status(500).send("Key không hợp lệ");
        return false;
    }

    try {
        const genAI = new GoogleGenerativeAI(apikey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash', tools: [{ 'google_search': {} }] });
        const Prompt = `Bạn là một nhà sáng tạo nội dung. Hãy tạo cho tôi dàn ý để viết một bài viết SEO thỏa các tiêu chí bên dưới:
            1. Phong cách viết: ${tone}
            2. Tối đa 4 lần xuất hiện H2
            3. Không viết về các quy trình hoặc cách đặt hàng
            4. Không so sánh với các đối thủ khác
            5. Bỏ tiêu đề "Kết luận", "Lời kết", "Mở đầu", "Tóm lại", "Tổng kết",...
            6. Độ dài bài viết: ${length}
            7. Từ khóa mục tiêu: ${keyword}
            8. Tiêu đề bài viết: ${title}
            9. Chuyển đổi phần nội dung của content sang dạng json encode để chắc chắn không bị lỗi khi parse json
            10. Không sử dụng nháy đôi (double quotes) trong nội dung json
            *Lưu ý: Không cần trả lời gì khác và chỉ hiển thị markdown theo cấu trúc json như bên dưới.
            \`\`\`json
            [
                {
                    "name": "<Tiêu đề H2>",
                    "subHeadings": [
                        "name": "<Tiêu đề H3>",
                    ],
                }
            ]
            \`\`\`
        `;
        const result = await model.generateContent(Prompt);
        res.setHeader('Content-Type', 'application/json');
        const data = {
            content: result.response.text(),
            promptTokenCount: result.response.usageMetadata.promptTokenCount,
            candidatesTokenCount: result.response.usageMetadata.candidatesTokenCount,
            totalTokenCount: result.response.usageMetadata.totalTokenCount
        };
        res.write(JSON.stringify(data));


        // const response = await model.generateContentStream(Prompt);
        // res.setHeader('Content-Type', 'text/stream');
        // for await (const chunk of response.stream) {
        //     const data = {
        //         content: chunk.text(),
        //         promptTokenCount: chunk.usageMetadata.promptTokenCount,
        //         candidatesTokenCount: chunk.usageMetadata.candidatesTokenCount,
        //         totalTokenCount: chunk.usageMetadata.totalTokenCount
        //     };
        //     res.write(JSON.stringify(data));
        // }
        // writeLog();
        res.end();
    } catch (error) {
        // writeError(error);
        // console.log(apikey);
        console.log(error);
        res.status(error.status).send(error.statusText);
    }
}

function writeLog() {
    const filePath = path.join(__dirname, 'apilog.txt'); // __dirname là thư mục của file script

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi khi đọc file:', err);
            return;
        }

        count = parseFloat(data);
        count++;

        fs.writeFile(filePath, count.toString(), 'utf8', (err) => {
            if (err) {
                console.error('Lỗi khi ghi file:', err);
                return;
            }
            console.log('Đã cập nhật file thành công!');
        });
    });
}
function writeError(error = "") {
    const filePath = path.join(__dirname, 'apilog_error.txt'); // __dirname là thư mục của file script

    fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
            console.error('Lỗi khi đọc file:', err);
            return;
        }

        newContent = data;
        newContent += `[Lỗi]_[${error}]\n\n`;

        fs.writeFile(filePath, newContent, 'utf8', (err) => {
            if (err) {
                console.error('Lỗi khi ghi file:', err);
                return;
            }
            console.log('Đã cập nhật file thành công!');
        });
    });
}

module.exports = { CreateContent, CreateOutline };
