package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.ChatMessage;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    /** 마지막으로 받은 id 이후의 새 메시지 (오래된 것부터) */
    List<ChatMessage> findByRoomIdAndIdGreaterThanOrderByIdAsc(Long roomId, Long id, Pageable pageable);

    /** 처음 열 때: 최근 메시지 (최신부터 — 서비스에서 뒤집어서 씁니다) */
    List<ChatMessage> findByRoomIdOrderByIdDesc(Long roomId, Pageable pageable);
}
