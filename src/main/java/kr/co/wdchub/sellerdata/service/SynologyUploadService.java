package kr.co.wdchub.sellerdata.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.core.io.FileSystemResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.client.BufferingClientHttpRequestFactory;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.net.URI;
import java.nio.file.Path;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * 시놀로지 NAS(wdc-hub.synology.me)로 파일을 실제로 전송(업로드)하는 공용 서비스입니다.
 * ProductImageService, NoticeFileService 등에서 로컬 디스크 저장 대신 이걸 씁니다.
 *
 * 업로드 API가 직접 만드신 커스텀 엔드포인트이고 인증은 없다고 하셔서 그 전제로 만들었습니다.
 * 다만 "성공 응답이 정확히 어떤 형식인지"는 아직 확인이 안 된 상태라(엔드포인트가 403/404를 내고 있어서),
 * 흔히 쓰이는 몇 가지 형식(JSON의 url/path/link 필드, 평문 URL, 응답 안에 섞인 URL)을 순서대로
 * 시도해서 찾아내도록 만들어뒀습니다. 실제 성공 응답을 확인하시면 parseUploadedUrl()만 맞춰드리면 됩니다.
 *
 * application.properties에 아래 값을 추가해주세요:
 *   app.synology.upload-url=https://wdc-hub.synology.me/upload/   (끝 슬래시 꼭 포함 — 301 리다이렉트 방지)
 *   app.synology.file-field-name=file                             (서버가 받는 파일 파트 이름)
 */
@Service
public class SynologyUploadService {

    private static final Logger log = LoggerFactory.getLogger(SynologyUploadService.class);

    // 요청 본문을 메모리에 모았다가 Content-Length를 붙여서 보냅니다.
    // 기본 RestTemplate은 환경에 따라 chunked(길이 없음)로 보내는데, 시놀로지 nginx/PHP는 그 경우
    // 본문을 읽지 못해 $_FILES가 비어버립니다. (curl은 Content-Length를 붙여 보내서 성공했던 것)
    private final RestTemplate restTemplate = createRestTemplate();

    private static RestTemplate createRestTemplate() {
        SimpleClientHttpRequestFactory base = new SimpleClientHttpRequestFactory();
        base.setConnectTimeout(10_000);   // 10초
        base.setReadTimeout(120_000);     // 응답 대기 2분 (큰 파일 대비)
        return new RestTemplate(new BufferingClientHttpRequestFactory(base));
    }
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Value("${app.synology.upload-url}")
    private String uploadUrl;

    @Value("${app.synology.file-field-name:file}")
    private String fileFieldName;

    /** 업로드 스크립트와 맞춘 공유 비밀키 (NAS의 index.php 안 $uploadToken과 같아야 함) */
    @Value("${app.synology.upload-token:}")
    private String uploadToken;

    /** 삭제 스크립트 주소. 비워두면 upload-url 뒤에 delete.php를 붙여 씁니다. */
    @Value("${app.synology.delete-url:}")
    private String deleteUrl;

    /** 삭제 스크립트와 맞춘 공유 비밀키 (NAS의 delete.php 안 $deleteToken과 같아야 함) */
    @Value("${app.synology.delete-token:}")
    private String deleteToken;

    /** MultipartFile을 그대로 업로드할 때 (디스크에 임시 저장할 필요 없는 경우 — 공지사항 첨부파일, 사업자등록증 등) */
    public String upload(MultipartFile file) {
        ByteArrayResource resource;
        try {
            resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            };
        } catch (IOException e) {
            throw new IllegalStateException("업로드할 파일을 읽는 중 오류가 발생했습니다.", e);
        }
        return doUpload(resource);
    }

    /** 로컬에 이미 저장된 파일(리사이즈 등 가공을 거친 파일)을 업로드할 때 — 상품 대표이미지 등 */
    public String upload(Path localFilePath, String filename) {
        FileSystemResource resource = new FileSystemResource(localFilePath.toFile()) {
            @Override
            public String getFilename() {
                return filename;
            }
        };
        return doUpload(resource);
    }

    private String doUpload(org.springframework.core.io.Resource resource) {
        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add(fileFieldName, resource);
        if (uploadToken != null && !uploadToken.isBlank()) {
            body.add("token", uploadToken); // 멀티파트 폼의 일반 항목으로 함께 전송
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);
        HttpEntity<MultiValueMap<String, Object>> requestEntity = new HttpEntity<>(body, headers);

        ResponseEntity<String> response;
        try {
            response = restTemplate.postForEntity(uploadUrl, requestEntity, String.class);
        } catch (RestClientException e) {
            throw new IllegalStateException("파일 서버(시놀로지)로 전송하는 중 오류가 발생했습니다: " + e.getMessage(), e);
        }

        if (!response.getStatusCode().is2xxSuccessful()) {
            throw new IllegalStateException("파일 서버가 업로드를 거부했습니다 (상태코드: " + response.getStatusCode() + ")");
        }

        String responseBody = response.getBody();
        String resultUrl = parseUploadedUrl(responseBody);

        if (resultUrl == null) {
            // 업로드 자체는 성공(2xx)했는데 응답에서 URL을 못 찾은 경우 — 원본 응답을 로그에 남겨서
            // 나중에 이 로그를 보고 parseUploadedUrl()의 파싱 규칙을 실제 응답 형식에 맞게 고치면 됩니다.
            log.warn("시놀로지 업로드는 성공했지만 응답에서 파일 URL을 찾지 못했습니다. 원본 응답: {}", responseBody);
            throw new IllegalStateException("업로드는 됐지만 파일 주소를 응답에서 찾지 못했어요. 관리자에게 문의해주세요.");
        }
        return resultUrl;
    }

    /**
     * 업로드 성공 응답에서 실제 파일 URL을 찾아냅니다. 형식을 몰라서 순서대로 시도합니다:
     * 1) JSON이면 흔한 필드명(url/fileUrl/path/link, data.url)에서 찾기
     * 2) 응답 전체가 그 자체로 URL이면 그대로 사용
     * 3) 응답 안 어딘가에 URL이 섞여 있으면 정규식으로 찾기
     */
    private String parseUploadedUrl(String responseBody) {
        if (responseBody == null || responseBody.isBlank()) return null;

        try {
            JsonNode node = objectMapper.readTree(responseBody);
            for (String field : List.of("url", "fileUrl", "path", "link")) {
                if (node.has(field) && !node.get(field).asText().isBlank()) {
                    return node.get(field).asText();
                }
            }
            if (node.has("data") && node.get("data").has("url")) {
                return node.get("data").get("url").asText();
            }
        } catch (Exception ignored) {
            // JSON이 아니면 아래에서 평문으로 처리합니다.
        }

        String trimmed = responseBody.trim();
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
            return trimmed;
        }

        Matcher m = Pattern.compile("https?://\\S+").matcher(responseBody);
        if (m.find()) {
            return m.group().replaceAll("[\"'<>,)]+$", "");
        }

        return null;
    }

    /**
     * 시놀로지에 올라간 파일을 삭제합니다 (공지 첨부파일, 상품 이미지 공용).
     *
     * - 시놀로지 파일 주소(https://wdc-hub.synology.me/upload/files/...)가 아니면 건드리지 않습니다.
     *   (예전 로컬 경로나 외부 주소는 무시)
     * - 트랜잭션 안에서 호출되면 "DB 커밋이 성공한 뒤에" 실제로 지웁니다.
     *   DB 저장/삭제가 실패해 롤백되면 파일은 그대로 남아서, 파일만 사라지는 사고를 막아줍니다.
     * - 파일 삭제가 실패해도 예외를 던지지 않고 로그만 남깁니다 (화면 동작은 계속 진행).
     */
    public void delete(String fileUrl) {
        if (fileUrl == null || fileUrl.isBlank()) return;
        final String url = fileUrl.trim();

        if (!isSynologyFileUrl(url)) {
            log.info("시놀로지 파일 주소가 아니라서 삭제하지 않습니다: {}", url);
            return;
        }

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    requestDelete(url);
                }
            });
        } else {
            requestDelete(url);
        }
    }

    private boolean isSynologyFileUrl(String url) {
        if (!(url.startsWith("https://") || url.startsWith("http://"))) return false;
        if (!url.contains("/upload/files/")) return false;
        try {
            String fileHost = URI.create(url).getHost();
            String uploadHost = URI.create(uploadUrl).getHost();
            return fileHost != null && fileHost.equalsIgnoreCase(uploadHost);
        } catch (Exception e) {
            return false;
        }
    }

    private String resolveDeleteUrl() {
        if (deleteUrl != null && !deleteUrl.isBlank()) return deleteUrl;
        return uploadUrl.endsWith("/") ? uploadUrl + "delete.php" : uploadUrl + "/delete.php";
    }

    private void requestDelete(String fileUrl) {
        if (deleteToken == null || deleteToken.isBlank()) {
            log.warn("app.synology.delete-token이 설정되지 않아 시놀로지 파일을 삭제하지 못했습니다: {}", fileUrl);
            return;
        }
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_FORM_URLENCODED);

            MultiValueMap<String, String> form = new LinkedMultiValueMap<>();
            form.add("url", fileUrl);
            form.add("token", deleteToken);

            ResponseEntity<String> response = restTemplate.postForEntity(
                    resolveDeleteUrl(), new HttpEntity<>(form, headers), String.class);
            log.info("시놀로지 파일 삭제 요청 완료 ({}): {} -> {}", response.getStatusCode(), fileUrl, response.getBody());
        } catch (Exception e) {
            log.warn("시놀로지 파일 삭제에 실패했습니다 (파일이 NAS에 남아있을 수 있어요): {} / {}", fileUrl, e.getMessage());
        }
    }
}
