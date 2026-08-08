# LacVietGames — Quy ước hình ảnh production

Tài liệu này chỉ dùng cho đội vận hành/thiết kế. Không hiển thị trên website.

## Nguyên tắc

- Không dùng ảnh demo hoặc số liệu giả trên bản production.
- Ảnh game phải đến từ media của game đã được duyệt.
- Banner sự kiện/sale dùng tài nguyên do LacVietGames quản lý.
- Ưu tiên WebP hoặc AVIF; PNG chỉ dùng khi cần nền trong suốt.
- Không nhúng khóa, URL nội bộ, tên bucket hoặc thông tin hạ tầng vào tên file/metadata hiển thị.

## Khe hình ảnh đề xuất

| Tên file gợi ý | Kích thước | Dùng ở đâu | Nội dung |
|---|---:|---|---|
| `home-hero.webp` | 1920×760 | Hero trang chủ | Key art LacVietGames / chiến dịch chính |
| `home-feature-01.webp` | 1200×600 | Khối game nổi bật | Game/sự kiện đang ưu tiên |
| `home-feature-02.webp` | 1200×600 | Khối phụ | Game mới / bộ sưu tập |
| `sale-banner.webp` | 1920×640 | Trang ưu đãi | Artwork chương trình ưu đãi |
| `publisher-banner.webp` | 1600×520 | Trung tâm phát hành | Artwork dành cho nhà phát hành |
| `wallet-banner.webp` | 1600×520 | Ví Lạc Coin | Artwork Lạc Coin, không chứa số dư giả |
| `default-game-cover.webp` | 1200×675 | Fallback hình game | Chỉ dùng khi game thiếu media hợp lệ; không chứa tên/game giả |
| `default-avatar.webp` | 512×512 | Avatar mặc định | Nhận diện LacVietGames trung tính |

## Media của từng game

Không sao chép media game vào thư mục này. Media game được quản lý theo bản ghi game và kho lưu trữ của nền tảng.

Khuyến nghị cho nhà phát hành:

- Cover/card: 1200×675 (16:9)
- Screenshot: tối thiểu 1600×900
- Thumbnail vuông nếu có: 800×800
- Trailer: poster 1600×900
- Ảnh không chèn URL, watermark kỹ thuật hoặc thông tin môi trường test

## Nhận diện màu

- Nền chính: `#090506`
- Đỏ thương hiệu: `#C3172C`
- Đỏ sáng: `#D42135`
- Đỏ đậm: `#8F0E1D`
- Gold: `#E9C15F`
- Chữ sáng: `#FFF8ED`

## Khi thay hình

1. Giữ nguyên tên file nếu đang được giao diện tham chiếu trực tiếp.
2. Tối ưu dung lượng trước khi commit/upload.
3. Kiểm tra desktop + mobile.
4. Không dùng tài nguyên chưa có quyền thương mại.
