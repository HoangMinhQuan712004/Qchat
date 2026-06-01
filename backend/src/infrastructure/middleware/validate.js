const { z } = require('zod');

function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`);
      return res.status(400).json({ message: errors[0], errors });
    }
    req.body = result.data;
    next();
  };
}

const schemas = {
  register: z.object({
    username: z.string().min(3, 'Tối thiểu 3 ký tự').max(30).regex(/^[a-zA-Z0-9_]+$/, 'Chỉ chứa chữ, số và _'),
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(6, 'Mật khẩu tối thiểu 6 ký tự').max(100),
    displayName: z.string().max(50).optional(),
  }),

  login: z.object({
    email: z.string().email('Email không hợp lệ'),
    password: z.string().min(1),
  }),

  transfer: z.object({
    toUsername: z.string().min(1, 'Tên người nhận không được trống'),
    amount: z.number({ invalid_type_error: 'amount phải là số' })
      .int('Số tiền phải là số nguyên')
      .positive('Số tiền phải lớn hơn 0')
      .max(10_000_000, 'Tối đa 10,000,000 mỗi lần'),
    description: z.string().max(200).optional(),
  }),

  createConversation: z.object({
    members: z.array(z.string()).min(1),
    title: z.string().max(100).optional(),
    isGroup: z.boolean().optional(),
  }),

  sendMessage: z.object({
    conversationId: z.string().min(1),
    type: z.enum(['text', 'image', 'file', 'video', 'audio']).default('text'),
    text: z.string().max(10_000).optional(),
    attachments: z.array(z.object({
      url: z.string(),
      name: z.string().optional(),
      size: z.number().optional(),
    })).optional().default([]),
    nonce: z.string().optional(),
  }),
};

module.exports = { validate, schemas };
