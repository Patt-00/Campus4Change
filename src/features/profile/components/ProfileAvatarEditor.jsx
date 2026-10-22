import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  NativeModules,
  PermissionsAndroid,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Avatar, ErrorText, Link } from '../../../shared/components/UI';
import { Icon } from '../../../shared/components/Icon';
import { AppButton } from '../../../shared/components/AppButton';
import { avatarPresets } from '../../../shared/data/avatarPresets';
import { C } from '../../../shared/theme/colors';
import { s } from '../../../shared/theme/styles';

export function ProfileAvatarEditor({
  accountId,
  name,
  avatarId,
  photoUri,
  onChange,
}) {
  const [busyAction, setBusyAction] = useState(null);
  const [error, setError] = useState('');
  const lastRecoveryAccount = useRef(null);
  const changeHandler = useRef(onChange);
  changeHandler.current = onChange;
  const busy = busyAction !== null;

  useEffect(() => {
    const storage = NativeModules.CampusStorage;
    if (
      !accountId ||
      typeof storage?.consumePendingProfilePhoto !== 'function' ||
      lastRecoveryAccount.current === accountId
    ) {
      return undefined;
    }
    lastRecoveryAccount.current = accountId;
    let active = true;
    storage
      .consumePendingProfilePhoto(accountId)
      .then(uri => {
        if (active && uri) {
          setError('');
          changeHandler.current({ photoUri: uri });
        }
      })
      .catch(recoveryError => {
        if (active) {
          setError(
            recoveryError instanceof Error
              ? recoveryError.message
              : 'Could not restore the captured profile photo. Try taking it again.',
          );
        }
      });
    return () => {
      active = false;
    };
  }, [accountId]);

  async function choosePhoto() {
    const storage = NativeModules.CampusStorage;
    if (!storage?.pickProfilePhoto) {
      setError('Photo selection is available in the Android app build.');
      return;
    }
    setBusyAction('picker');
    setError('');
    try {
      const uri = await storage.pickProfilePhoto(accountId);
      if (uri) {
        onChange({ photoUri: uri });
      }
    } catch (pickError) {
      setError(
        pickError instanceof Error
          ? pickError.message
          : 'Could not select this photo. Try another image.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  async function takePhoto() {
    const storage = NativeModules.CampusStorage;
    if (!storage?.captureProfilePhoto) {
      setError('Camera capture is available in the Android app build.');
      return;
    }
    if (busy) return;

    setBusyAction('camera');
    setError('');
    try {
      const permission = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: 'Use your camera',
          message:
            'Campus4Change uses the camera only when you choose to take a profile photo. The image stays on this device.',
          buttonPositive: 'Continue',
          buttonNegative: 'Not now',
        },
      );
      if (permission !== PermissionsAndroid.RESULTS.GRANTED) {
        setError(
          permission === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
            ? 'Camera permission is off in Android settings. You can still choose a photo or avatar.'
            : 'Camera access is needed to take a photo. You can still choose a photo or avatar.',
        );
        return;
      }

      const uri = await storage.captureProfilePhoto(accountId);
      if (uri) {
        onChange({ photoUri: uri });
      }
    } catch (captureError) {
      setError(
        captureError instanceof Error
          ? captureError.message
          : 'Could not take this photo. You can choose a photo or avatar instead.',
      );
    } finally {
      setBusyAction(null);
    }
  }

  function removePhoto() {
    Alert.alert(
      'Remove saved photo?',
      'When you save, the app copy will be deleted from this device and your profile will use the selected avatar.',
      [
        { text: 'Keep photo', style: 'cancel' },
        {
          text: 'Remove photo',
          style: 'destructive',
          onPress: async () => {
            setError('');
            onChange({ photoUri: '' });
          },
        },
      ],
    );
  }

  return (
    <View style={s.card}>
      <View style={styles.previewRow}>
        <Avatar
          name={name}
          size={60}
          avatarId={avatarId}
          photoUri={photoUri}
        />
        <View style={s.grow}>
          <Text style={s.name}>Make this profile yours</Text>
          <Text style={s.muted}>Choose a photo or a simple color avatar.</Text>
        </View>
        {busy && <ActivityIndicator color={C.cyan} />}
      </View>

      <AppButton
        title={busyAction === 'camera' ? 'OPENING CAMERA...' : 'TAKE A PHOTO'}
        outline
        disabled={busy}
        onPress={takePhoto}
        style={styles.cameraButton}
      />
      <AppButton
        title={busyAction === 'picker' ? 'OPENING PHOTO PICKER...' : 'CHOOSE A PHOTO'}
        outline
        disabled={busy}
        onPress={choosePhoto}
        style={styles.photoButton}
      />
      {photoUri ? (
        <Link label="Remove photo from this device" danger onPress={removePhoto} />
      ) : null}

      <Text style={styles.avatarLabel}>Avatar presets</Text>
      <View style={styles.presets}>
        {avatarPresets.map(preset => {
          const selected = !photoUri && avatarId === preset.id;
          return (
            <TouchableOpacity
              key={preset.id}
              accessibilityRole="radio"
              accessibilityLabel={`${preset.label} avatar`}
              accessibilityState={{ selected }}
              onPress={() => {
                setError('');
                onChange({ avatarId: preset.id, photoUri: '' });
              }}
              style={[styles.preset, selected && styles.selectedPreset]}
            >
              <Avatar name={name} size={36} avatarId={preset.id} />
              {selected && (
                <View style={styles.check}>
                  <Icon name="check" size={12} color={C.bg} />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      <Text style={styles.privacyNote}>
        Camera opens only when you choose Take a Photo. Photos stay on this device; avatar presets can appear with your tutor listing.
      </Text>
      <ErrorText value={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  photoButton: {
    marginTop: 8,
    marginBottom: 4,
  },
  cameraButton: {
    marginTop: 16,
    marginBottom: 0,
  },
  avatarLabel: {
    fontFamily: 'Inter-SemiBold',
    color: C.text,
    fontSize: 13,
    marginTop: 12,
    marginBottom: 8,
  },
  presets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  preset: {
    width: '22%',
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedPreset: {
    borderColor: C.cyan,
    backgroundColor: C.chip,
  },
  check: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.cyan,
  },
  privacyNote: {
    fontFamily: 'Inter-Regular',
    color: C.muted,
    fontSize: 11,
    lineHeight: 16,
    marginTop: 10,
  },
});
