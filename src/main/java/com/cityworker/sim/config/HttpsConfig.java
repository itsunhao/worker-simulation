package com.cityworker.sim.config;

import org.apache.catalina.connector.Connector;
import org.apache.coyote.http11.Http11NioProtocol;
import org.apache.tomcat.util.net.SSLHostConfig;
import org.apache.tomcat.util.net.SSLHostConfigCertificate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.embedded.tomcat.TomcatServletWebServerFactory;
import org.springframework.boot.web.server.WebServerFactoryCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.ClassPathResource;

import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.StandardCopyOption;

/**
 * 双端口配置：保留默认 HTTP 端口，同时监听一个 HTTPS（自签名证书）端口。
 *
 * 用途：WebGPU 属于浏览器安全上下文（Secure Context）专属 API，
 * 直接通过 http://IP 访问（非安全上下文）时浏览器不暴露 WebGPU 接口。
 * 增加 HTTPS 端口后，配合把证书导入浏览器/系统信任库，
 * 即可让 https://IP:8898 被认定为安全上下文，解锁 WebGPU。
 *
 * 若证书未导入信任库，页面仅出现自签名警告，游戏仍可走 WebGL 渲染路径正常游玩。
 */
@Configuration
public class HttpsConfig {

    /** HTTPS 监听端口，可用 --server.https.port 覆盖 */
    @Value("${server.https.port:8896}")
    private int httpsPort;

    /** 证书位置：classpath: 内嵌，或绝对路径外部文件 */
    @Value("${server.https.keystore:classpath:ssl/keystore.p12}")
    private String keystore;

    @Value("${server.https.keystore-password:changeit}")
    private String keystorePassword;

    @Value("${server.https.keystore-alias:worker}")
    private String keystoreAlias;

    @Bean
    public WebServerFactoryCustomizer<TomcatServletWebServerFactory> httpsConnectorCustomizer() {
        return factory -> {
            Connector httpsConnector = new Connector("org.apache.coyote.http11.Http11NioProtocol");
            httpsConnector.setScheme("https");
            httpsConnector.setSecure(true);
            httpsConnector.setPort(httpsPort);
            Http11NioProtocol proto = (Http11NioProtocol) httpsConnector.getProtocolHandler();
            proto.setSSLEnabled(true);
            File ks = resolveKeystore();
            SSLHostConfig sslHostConfig = new SSLHostConfig();
            sslHostConfig.setProtocols("TLSv1.2,TLSv1.3");
            SSLHostConfigCertificate cert =
                    new SSLHostConfigCertificate(sslHostConfig, SSLHostConfigCertificate.Type.RSA);
            cert.setCertificateKeystoreFile(ks.getAbsolutePath());
            cert.setCertificateKeystorePassword(keystorePassword);
            cert.setCertificateKeystoreType("PKCS12");
            cert.setCertificateKeyAlias(keystoreAlias);
            sslHostConfig.addCertificate(cert);
            proto.addSslHostConfig(sslHostConfig);
            factory.addAdditionalTomcatConnectors(httpsConnector);
        };
    }

    /** classpath 内嵌证书在 jar 中不是真实文件，需复制到临时文件；外部路径则直接使用 */
    private File resolveKeystore() {
        if (keystore.startsWith("classpath:")) {
            String path = keystore.substring("classpath:".length());
            try (InputStream in = new ClassPathResource(path).getInputStream()) {
                File tmp = File.createTempFile("ws-keystore-", ".p12");
                tmp.deleteOnExit();
                Files.copy(in, tmp.toPath(), StandardCopyOption.REPLACE_EXISTING);
                return tmp;
            } catch (IOException e) {
                throw new IllegalStateException("无法读取内嵌 HTTPS 证书: " + path, e);
            }
        }
        File f = new File(keystore);
        if (!f.isFile()) {
            throw new IllegalStateException("HTTPS 证书文件不存在: " + keystore);
        }
        return f;
    }
}
