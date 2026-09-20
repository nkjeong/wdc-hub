package kr.co.wdchub.sellerdata.controller;

import kr.co.wdchub.sellerdata.domain.NoticeTag;
import kr.co.wdchub.sellerdata.dto.NoticeDtos.NoticeRequest;
import kr.co.wdchub.sellerdata.dto.NoticeDtos.NoticeResponse;
import kr.co.wdchub.sellerdata.security.CustomUserDetails; // TODO: 실제 패키지 경로로 수정
import kr.co.wdchub.sellerdata.service.NoticeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

/**
 * 공지사항 관리 — 관리자 전용.
 * 등록/수정은 첨부파일 때문에 multipart/form-data로 받습니다.
 * 폼 필드명: tag, title, content, file (file은 선택)
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/notices")
@PreAuthorize("hasRole('ADMIN')")
public class AdminNoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public String page(@AuthenticationPrincipal CustomUserDetails userDetails, Model model) {
        model.addAttribute("companyName", userDetails.getMember().getCompanyName());
        model.addAttribute("tags", NoticeTag.values()); // 구분(배지) 셀렉트 옵션
        return "admin/notices"; // templates/admin/notices.html
    }

    @GetMapping("/list")
    @ResponseBody
    public List<NoticeResponse> list() {
        return noticeService.getAll();
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public NoticeResponse create(@ModelAttribute NoticeRequest req,
                                 @RequestParam(value = "file", required = false) MultipartFile file) {
        return noticeService.create(req, file);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseBody
    public void update(@PathVariable Long id,
                       @ModelAttribute NoticeRequest req,
                       @RequestParam(value = "file", required = false) MultipartFile file) {
        noticeService.update(id, req, file);
    }

    @DeleteMapping("/{id}")
    @ResponseBody
    public void delete(@PathVariable Long id) {
        noticeService.delete(id);
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
