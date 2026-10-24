package com.campus4change

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNull
import org.junit.Test

class PendingProfilePhotoCaptureTest {
    @Test
    fun preservesCaptureMetadataAcrossProcessRecreation() {
        val pending = PendingProfilePhotoCapture(
            accountId = "firebase-user-123",
            capturePath = "/data/user/0/com.campus4change/cache/profile-photo-captures/photo.jpg",
            captureUri = "content://com.campus4change.profilephotos/camera%20capture.jpg",
            resultReady = true,
            savedUri = "file:///data/user/0/com.campus4change/files/profile_photos/photo.jpg",
        )

        val restored = PendingProfilePhotoCapture.deserialize(pending.serialize())

        assertEquals(pending, restored)
    }

    @Test
    fun leavesAnIncompleteCaptureMarkedAsNotReady() {
        val pending = PendingProfilePhotoCapture(
            accountId = "firebase-user-123",
            capturePath = "/data/user/0/com.campus4change/cache/profile-photo-captures/photo.jpg",
            captureUri = "content://com.campus4change.profilephotos/photo.jpg",
        )

        val restored = PendingProfilePhotoCapture.deserialize(pending.serialize())

        assertFalse(restored?.resultReady ?: true)
        assertNull(restored?.savedUri)
    }

    @Test
    fun rejectsMalformedOrUnversionedCaptureMetadata() {
        assertNull(PendingProfilePhotoCapture.deserialize(null))
        assertNull(PendingProfilePhotoCapture.deserialize("not-a-record"))
        assertNull(PendingProfilePhotoCapture.deserialize("0\nuser\npath\nuri\n1\n"))
        assertNull(PendingProfilePhotoCapture.deserialize("1\nuser\npath\nuri\n0\n"))
    }
}
