const express = require("express");
const fs = require("fs");
const multer = require("multer");
const path = require("path");

const { GoogleGenAI } = require("@google/genai");

async function CreateContent(req, res) {
  const { apikey } = req.headers;
  const { length, keyword, tone, note, outline, title, langs } = req.body;

  if (apikey == "" || typeof apikey == "undefined") {
    // writeError('key error 2');
    res.status(500).send("Key không hợp lệ");
    return;
  }

  let lang_txt = [];
  for (const key in langs) {
    if (Object.prototype.hasOwnProperty.call(langs, key)) {
      const e = langs[key];
      if (key == "vi") continue;
      lang_txt.push(
        `\"content${key}\": string (markdown) - Nội dung bài viết dưới dạng ${e}`
      );
    }
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: apikey });
    const Prompt = `
        *${note}*  
        Bạn là một nhà sáng tạo nội dung chuyên nghiệp. Dựa vào **dàn ý có sẵn** dưới dạng JSON như bên dưới:
        
        \`\`\`json
        ${outline}
        \`\`\`
        
        Hãy viết một **bài viết SEO hoàn chỉnh** theo tất cả các yêu cầu sau:
        
        1. **Phong cách viết**: ${tone}
        2. **Từ khóa mục tiêu chính**: ${keyword}
        3. **Giữ nguyên hoàn toàn** nội dung và **thứ tự** các tiêu đề H2, H3 theo dàn ý
        4. **Độ dài bài viết**: Bài viết cần phải có **đúng độ dài** khoảng **${length} từ**. Vui lòng không viết quá dài hoặc quá ngắn so với yêu cầu.
        5. **Tiêu đề bài viết**: ${title}
        6. **Mật độ từ khóa**: dao động từ 1% đến 1.5%
        7. **Không được sử dụng** các tiêu đề hoặc nội dung có liên quan đến: “Kết luận”, “Lời kết”, “Tóm lại”, “Mở đầu”, “Tổng kết”, v.v.
        8. **Không viết thêm bất kỳ đoạn nào nằm ngoài dàn ý**
        9. Nội dung bài viết cần được **biến tấu linh hoạt, sinh động**, tránh đơn điệu. Hãy sử dụng **danh sách (bullet point hoặc numbered list)**, **bảng (table)** và **xuống dòng** khi thấy phù hợp để giúp bài viết trở nên rõ ràng, dễ đọc và sinh động hơn. Đặc biệt chú ý đến việc chia nhỏ các ý tưởng lớn và trình bày chúng theo các nhóm có cấu trúc dễ hiểu.
        10. Nội dung bài viết phải được encode dưới dạng **JSON hợp lệ**, để đảm bảo không bị lỗi khi parse
        11. **Không được sử dụng dấu nháy đôi** ("") trong nội dung chuỗi JSON — chỉ dùng nháy đơn ('') nếu cần
        
        ---
        
        **Sau khi hoàn tất bài viết, hãy cung cấp đầu ra ở đúng định dạng JSON như sau (không được kèm theo bất kỳ lời giải thích nào):**
        
        \`\`\`json
        {
          "title": string,            // SEO Title (40-70 ký tự)
          "description": string,      // SEO Description (160-300 ký tự)
          "slug": string,             // Slug SEO Title (dùng để tạo URL)
          "content": string,          // Nội dung bài viết ở dạng markdown (theo dàn ý, có thể bao gồm list và bảng nếu cần)
          ${lang_txt.join(",\n")}
        }
        \`\`\`
        `;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: Prompt,
    });

    res.setHeader("Content-Type", "application/json");
    const data = {
      content: result.text,
      promptTokenCount: result.usageMetadata.promptTokenCount,
      candidatesTokenCount: result.usageMetadata.candidatesTokenCount,
      totalTokenCount: result.usageMetadata.totalTokenCount,
    };
    res.write(JSON.stringify(data));
    res.end();
  } catch (error) {
    console.log(error);
    res.status(error.status).send(error.statusText);
  }
}
async function CreateOutline(req, res) {
  const { apikey } = req.headers;
  const { length, keyword, title, tone } = req.body;

  if (apikey == "" || typeof apikey == "undefined") {
    // writeError('key error 1');
    res.status(500).send("Key không hợp lệ");
    return false;
  }

  try {
    const genAI = new GoogleGenAI({ apiKey: apikey });
    const Prompt = `
        Bạn là một chuyên gia sáng tạo nội dung. Hãy giúp tôi tạo **dàn ý chi tiết** cho một bài viết SEO, đáp ứng chính xác các yêu cầu sau:

        1. **Phong cách viết**: ${tone}
        2. **Độ dài dự kiến của bài viết**: khoảng ${length} từ. Dàn ý phải phù hợp với độ dài này — không quá sơ sài và không quá dài.
        3. **Số lượng tiêu đề H2 tối đa là 4**, mỗi H2 có thể có từ 1 đến 3 H3 bên trong.
        4. Tuyệt đối **không đưa nội dung về quy trình, cách đặt hàng**, hoặc các bước thực hiện.
        5. Không so sánh với bất kỳ đối thủ hay sản phẩm dịch vụ tương tự nào.
        6. Loại bỏ hoàn toàn các tiêu đề như: "Kết luận", "Lời kết", "Mở đầu", "Tóm lại", "Tổng kết",...
        7. **Từ khóa mục tiêu**: ${keyword}
        8. **Tiêu đề chính của bài viết**: ${title}
        9. Kết quả trả về phải ở dạng **JSON encode chuẩn**, không được để lỗi khi parse.
        10. **Không được sử dụng dấu nháy đôi (double quotes)** trong nội dung chuỗi JSON.
        11. **Chỉ trả về JSON đúng theo cấu trúc bên dưới, không viết thêm bất kỳ nội dung nào khác.**

        \`\`\`json
        [
        {
            "name": "<Tiêu đề H2>",
            "subHeadings": [
            { "name": "<Tiêu đề H3>" },
            { "name": "<Tiêu đề H3>" }
            ]
        },
        {
            "name": "<Tiêu đề H2>",
            "subHeadings": [
            { "name": "<Tiêu đề H3>" }
            ]
        }
        ]
        \`\`\`

        Lưu ý: Dàn ý phải được xây dựng để triển khai bài viết có độ dài khoảng ${length} từ một cách hợp lý và trọn vẹn.
        `;

    const result = await genAI.models.generateContent({
      model: "gemini-2.0-flash",
      contents: Prompt,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    res.setHeader("Content-Type", "application/json");
    const data = {
      content: result.text,
      promptTokenCount: result.usageMetadata.promptTokenCount,
      candidatesTokenCount: result.usageMetadata.candidatesTokenCount,
      totalTokenCount: result.usageMetadata.totalTokenCount,
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
module.exports = { CreateContent, CreateOutline };
