package com.campus4change

import java.io.File
import java.nio.file.Files
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class ProfilePhotoCleanupTest {
    @Test
    fun removesOnlyDraftPhotosForTheOwnerAndPreservesTheSavedPhoto() {
        val directory = Files.createTempDirectory("profile-photo-cleanup").toFile()
        try {
            val saved = File(directory, "owner-saved.jpg").apply { writeText("saved") }
            val draft = File(directory, "owner-draft.jpg").apply { writeText("draft") }
            val otherAccount = File(directory, "other-draft.jpg").apply { writeText("other") }

            val failures = deleteUnusedProfilePhotos(
                directory,
                ownerFilePrefix = "owner-",
                keepUri = "file://${saved.absolutePath}",
            )

            assertEquals(emptyList<File>(), failures)
            assertTrue(saved.isFile)
            assertFalse(draft.exists())
            assertTrue(otherAccount.isFile)
        } finally {
            directory.deleteRecursively()
        }
    }

    @Test
    fun removesAllPhotosForTheOwnerWhenNoSavedUriExists() {
        val directory = Files.createTempDirectory("profile-photo-cleanup").toFile()
        try {
            val ownerPhoto = File(directory, "owner-photo.jpg").apply { writeText("owner") }
            val otherAccount = File(directory, "other-photo.jpg").apply { writeText("other") }

            val failures = deleteUnusedProfilePhotos(
                directory,
                ownerFilePrefix = "owner-",
                keepUri = null,
            )

            assertEquals(emptyList<File>(), failures)
            assertFalse(ownerPhoto.exists())
            assertTrue(otherAccount.isFile)
        } finally {
            directory.deleteRecursively()
        }
    }
}
