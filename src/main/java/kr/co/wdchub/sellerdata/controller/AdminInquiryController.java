package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.InquiryAttachment;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.AnswerRequest;
import kr.co.wdchub.sellerdata.dto.InquiryDtos.InquiryDto;
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
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.net.MalformedURLException;
import java.nio.charset.StandardCharsets;
import java.util.List;

/** 1:1 문의관리 — 관리자 전용. 문의를 확인하고 답변/상태를 저장합니다. */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/inquiries")
@PreAuthorize("hasRole('ADMIN')")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        return "admin/inquiries"; // templates/admin/inquiries.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<InquiryDto> list() {
        return inquiryService.getAll();
    }

    @PutMapping("/{id}")
    @ResponseBody
    public InquiryDto answer(@PathVariable Long id, @RequestBody AnswerRequest req) {
        return inquiryService.answer(id, req);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public void delete(@PathVariable Long id) {
        inquiryService.delete(id);
    }

    @GetMapping("/attachments/{id}/download")
    public ResponseEntity<Resource> download(@PathVariable Long id) throws MalformedURLException {
        InquiryAttachment a;
        try {
            a = inquiryService.getAttachment(id, null);
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
}
