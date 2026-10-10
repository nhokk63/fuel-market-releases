# Fuel Market — cập nhật Android

Ứng dụng `vn.fuel.market`. APK **1.8.0** (10800); OTA **1080001** dành cho APK 10800.

[Tải APK 1.8.0](https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/releases/1.8.0/Fuel-Market-1.8.0.apk)

Cài đè APK cùng chữ ký để giữ dữ liệu. Sau đó bấm biểu tượng ↓ trong app để kiểm tra OTA/APK. Android yêu cầu người dùng xác nhận cài APK. OTA thay đổi giao diện mà không cần cài lại APK, có phục hồi khi khởi động lỗi.

Địa chỉ cập nhật cố định:
`https://raw.githubusercontent.com/nhokk63/fuel-market-releases/main/manifest.json`

Nếu đang dùng bản cũ: vào Thông báo → Cập nhật ứng dụng, nhập địa chỉ trên và kiểm tra để tải APK mới. Không cần đăng nhập GitHub trong app.

## Phát hành

Kho chỉ chứa APK, OTA và manifest đã ký. Không chứa API key, mã nguồn riêng hay khóa ký. Không sửa manifest sau khi ký; tạo bằng công cụ package_release.py trong bản nguồn riêng. Tăng sequence cho OTA, versionCode cho APK. Giữ nguyên tệp phiên bản cũ và cập nhật manifest cùng hoặc sau tệp mới.

Bản OTA 1080001 là gói cơ sở cùng nội dung giao diện APK 1.8.0, không bổ sung tính năng ngoài APK đó. Thay đổi native cần cập nhật APK. Đã kiểm tra chữ ký, SHA-256 và giao diện mô phỏng; chưa kiểm thử cài đè/khôi phục trên thiết bị Android thật.
