package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.dto.NoticeDtos.NoticeResponse;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;

/**
 * 회원용 공지사항 — 전체보기 화면과 첨부파일 다운로드.
 *
 * 첨부파일은 시놀로지(다른 도메인)에 있어서 <a download>만으로는 "저장"이 되지 않고 브라우저에서 열려 버립니다.
 * 그래서 앱 서버가 파일을 받아 Content-Disposition: attachment 로 내려주는 방식을 씁니다.
 * (원래 파일 이름으로 저장되고, 한글 이름도 안전하게 처리됩니다.)
 *
 * ※ 이미 "/notices"를 매핑한 회원용 컨트롤러가 있다면 이 파일로 교체하세요.
 *    두 컨트롤러가 같은 주소를 매핑하면 앱이 시작되지 않습니다.
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/notices")
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        model.addAttribute("notices", noticeService.getAll());
        return "notices"; // templates/notices.html
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws MalformedURLException {
        NoticeResponse notice;
        try {
            notice = noticeService.getById(id);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }

        if (notice.attachmentUrl() == null || notice.attachmentUrl().isBlank()) {
            return ResponseEntity.notFound().build();
        }

        Resource resource = new UrlResource(notice.attachmentUrl());
        String fileName = notice.attachmentFileName() != null ? notice.attachmentFileName() : "attachment";

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(fileName, StandardCharsets.UTF_8).build().toString())
                .body(resource);
    }
}
