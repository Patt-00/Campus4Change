package com.campus4change

import com.google.firebase.appcheck.AppCheckProviderFactory
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

object CampusAppCheckProvider {
    fun factory(): AppCheckProviderFactory = DebugAppCheckProviderFactory.getInstance()
}
