# Fuel Market — cập nhật Android

Ứng dụng `vn.fuel.market`. APK **1.8.1** (10801); OTA **1080101** dành cho APK 10801.

[Tải APK 1.8.1](https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/releases/1.8.1/Fuel-Market-1.8.1.apk)

Cài đè APK cùng chữ ký để giữ dữ liệu. Sau đó bấm biểu tượng ↓ trong app để kiểm tra OTA/APK. Android yêu cầu người dùng xác nhận cài APK. OTA thay đổi giao diện mà không cần cài lại APK, có phục hồi khi khởi động lỗi.

Địa chỉ cập nhật cố định:
`https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/manifest.json`

**Sửa lỗi 1.8.0:** hộp xác nhận JavaScript bị Android bỏ qua, khiến nút OTA/APK không phản hồi. Cần tải APK 1.8.1 từ liên kết trên và cài đè một lần; không gỡ app. Bản mới bật WebChromeClient và nút tải cập nhật không còn phụ thuộc confirm(). Không cần đăng nhập GitHub trong app.

## Phát hành

Kho chỉ chứa APK, OTA và manifest đã ký. Không chứa API key, mã nguồn riêng hay khóa ký. Không sửa manifest sau khi ký; tạo bằng công cụ package_release.py trong bản nguồn riêng. Tăng sequence cho OTA, versionCode cho APK. Giữ nguyên tệp phiên bản cũ và cập nhật manifest cùng hoặc sau tệp mới.

Bản OTA 1080101 là gói cơ sở cùng nội dung giao diện APK 1.8.1, không bổ sung tính năng ngoài APK đó. Thay đổi native cần cập nhật APK. Đã kiểm tra chữ ký, SHA-256 và giao diện mô phỏng; chưa kiểm thử cài đè/khôi phục trên thiết bị Android thật.
