package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.InquiryAttachment;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.InquiryDto;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.InquiryRequest;
import kr.co.wdchub.sellerdata.security.CustomUserDetails;
import kr.co.wdchub.sellerdata.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * 회원용 1:1 문의.
 * - GET  /inquiries                          : 문의 화면 (접수 폼 + 내 문의 내역)
 * - GET  /inquiries/list                     : 내 문의 목록(JSON, 답변 포함)
 * - POST /inquiries                          : 문의 접수 (multipart: category, title, content, files)
 * - GET  /inquiries/attachments/{id}/download: 내 문의의 첨부파일 다운로드
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/inquiries")
public class InquiryController {

    private final InquiryService inquiryService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "inquiries"; // templates/inquiries.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<InquiryDto> list(@AuthenticationPrincipal CustomUserDetails userDetails) {
        return inquiryService.getMine(userDetails.getUsername());
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public InquiryDto create(@ModelAttribute InquiryRequest req,
                             @RequestParam(value = "files", required = false) List<MultipartFile> files,
                             @AuthenticationPrincipal CustomUserDetails userDetails) {
        return inquiryService.create(req, files, userDetails.getUsername(),
                userDetails.getMember().getCompanyName(), userDetails.getMember().getPhoneNumber());
    }

    @GetMapping("/attachments/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id,
                                             @AuthenticationPrincipal CustomUserDetails userDetails) throws MalformedURLException {
        InquiryAttachment a;
        try {
            a = inquiryService.getAttachment(id, userDetails.getUsername());
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(a.getFileName(), StandardCharsets.UTF_8).build().toString())
                .body(new UrlResource(a.getFileUrl()));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalArgument(IllegalArgumentException e) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(e.getMessage());
    }

    @ExceptionHandler(IllegalStateException.class)
    @ResponseBody
    public ResponseEntity<String> handleIllegalState(IllegalStateException e) {
        // 시놀로지 업로드 실패 등
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage());
    }
}
