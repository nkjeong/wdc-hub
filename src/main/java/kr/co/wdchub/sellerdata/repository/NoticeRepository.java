package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Notice;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NoticeRepository extends JpaRepository<Notice, Long> {

    // 대시보드 위젯 등, 최근 몇 개만 필요할 때 Pageable로 개수를 제한해서 씁니다 (예: PageRequest.of(0, 4)).
    List<Notice> findAllByOrderByCreatedAtDesc(Pageable pageable);

    // 공지사항 전체보기 화면, 관리자 공지사항관리 화면에서 전체 목록을 최신순으로 받을 때 사용
    List<Notice> findAllByOrderByCreatedAtDesc();
}
