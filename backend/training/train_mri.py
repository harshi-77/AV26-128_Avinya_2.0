from training.trainer import parse_args, train_modality


if __name__ == "__main__":
    args = parse_args("mri", ["mri", "MRI"])
    train_modality(args)
