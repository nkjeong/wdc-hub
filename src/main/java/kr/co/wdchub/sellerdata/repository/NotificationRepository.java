package kr.co.wdchub.sellerdata.repository;

import kr.co.wdchub.sellerdata.domain.Notification;
import kr.co.wdchub.sellerdata.domain.NotificationAudience;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Long> {

    // 관리자 공용
    List<Notification> findByAudienceOrderByCreatedAtDesc(NotificationAudience audience, Pageable pageable);

    long countByAudienceAndReadYnFalse(NotificationAudience audience);

    @Modifying
    @Query("update Notification n set n.readYn = true where n.audience = :audience and n.readYn = false")
    int markAllReadForAudience(@Param("audience") NotificationAudience audience);

    // 회원 개인
    List<Notification> findByAudienceAndRecipientUsernameOrderByCreatedAtDesc(
            NotificationAudience audience, String recipientUsername, Pageable pageable);

    long countByAudienceAndRecipientUsernameAndReadYnFalse(NotificationAudience audience, String recipientUsername);

    @Modifying
    @Query("update Notification n set n.readYn = true "
            + "where n.audience = :audience and n.recipientUsername = :username and n.readYn = false")
    int markAllReadForMember(@Param("audience") NotificationAudience audience, @Param("username") String username);
}
