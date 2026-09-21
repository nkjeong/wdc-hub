package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.ChatRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface ChatRoomRepository extends JpaRepository<ChatRoom, Long> {

    Optional<ChatRoom> findByMemberUsername(String memberUsername);

    List<ChatRoom> findAllByOrderByLastMessageAtDescIdDesc();

    @Query("select coalesce(sum(r.adminUnread), 0) from ChatRoom r")
    long sumAdminUnread();
}
